import { Plugin, Editor, MarkdownView, Notice } from 'obsidian';
import { EmojiPickerModal } from './src/emoji-picker-modal';
import { EmojiItem, EmojiSelectorSettings, DEFAULT_SETTINGS } from './src/types';
import { EmojiManager } from './src/emoji-manager';
import { EmojiSelectorSettingTab } from './src/settings-tab';
import { EmojiSuggest } from './src/emoji-suggest';
import { i18n } from './src/i18n';
import { perfMonitor } from './src/performance-monitor';
import { logger, LogLevel } from './src/logger';

export default class EmojiSelectorPlugin extends Plugin {
	settings: EmojiSelectorSettings;
	emojiManager: EmojiManager | null = null;
	private settingsLoaded: boolean = false;
	private settingsLoadPromise: Promise<void> | null = null;
	private cssInjected: boolean = false;
	private emojiSuggest: EmojiSuggest | null = null;

	async onload() {
		perfMonitor.start('plugin-onload');

		// Load only settings on startup (now that cache is separated, data.json is small)
		await this.loadSettings();

		// Initialize logger with user's preferred level
		logger.setLogLevel(this.settings.debugLogLevel as LogLevel);

		// Add settings tab (Requirement 5.4) - can be added immediately
		this.addSettingTab(new EmojiSelectorSettingTab(this.app, this));

		// Add command to open emoji picker (Requirement 5.1)
		this.addCommand({
			id: 'open-emoji-picker',
			name: i18n.t('openEmojiPicker'),
			editorCallback: async (editor: Editor) => {
				await this.openEmojiPicker(editor);
			}
		});

		// Add ribbon icon to trigger emoji picker (Requirement 5.2)
		this.addRibbonIcon('smile', i18n.t('openEmojiPicker'), async () => {
			// Get the active editor
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView && activeView.editor) {
				await this.openEmojiPicker(activeView.editor);
			} else {
				// Show notice if no active editor
				new Notice(i18n.t('noActiveCollection'));
			}
		});

		// Register emoji suggest for quick insertion immediately with default settings
		// This ensures it works right after plugin loads, then gets updated when settings load
		this.setupEmojiSuggestImmediate();

		perfMonitor.end('plugin-onload');
		perfMonitor.logMetrics();
	}

	onunload() {
		const dynamicStyle = document.getElementById('emoji-selector-dynamic-styles');
		if (dynamicStyle) {
			dynamicStyle.remove();
		}
	}

	/**
	 * Load plugin settings asynchronously (non-blocking) - kept for compatibility
	 */
	private loadSettingsAsync(): void {
		if (this.settingsLoadPromise) {
			return;
		}

		this.settingsLoadPromise = this.loadSettings();
	}

	/**
	 * Setup emoji suggest based on settings
	 */
	private async setupEmojiSuggest(): Promise<void> {
		// Wait for settings to load
		await this.ensureSettingsLoaded();

		// Register or unregister based on settings
		if (this.settings.enableQuickInsertion) {
			if (!this.emojiSuggest) {
				this.emojiSuggest = new EmojiSuggest(this);
				this.registerEditorSuggest(this.emojiSuggest);
			}
		} else {
			if (this.emojiSuggest) {
				// Note: Obsidian doesn't provide unregisterEditorSuggest, 
				// so we'll just disable it by setting it to null
				this.emojiSuggest = null;
			}
		}
	}

	/**
	 * Setup emoji suggest immediately with default settings, then update when settings load
	 */
	private setupEmojiSuggestImmediate(): void {
		// Register with default settings immediately to ensure it works on startup
		if (DEFAULT_SETTINGS.enableQuickInsertion && !this.emojiSuggest) {
			this.emojiSuggest = new EmojiSuggest(this);
			this.registerEditorSuggest(this.emojiSuggest);
		}

		// Then update based on actual settings when they load (fire and forget)
		(async () => {
			try {
				await this.ensureSettingsLoaded();
				// Re-evaluate based on actual settings
				if (this.settings.enableQuickInsertion) {
					if (!this.emojiSuggest) {
						this.emojiSuggest = new EmojiSuggest(this);
						this.registerEditorSuggest(this.emojiSuggest);
					}
				} else {
					// If disabled in settings, disable it
					this.emojiSuggest = null;
				}
			} catch (error) {
				console.error('Failed to setup emoji suggest:', error);
			}
		})();
	}



	/**
	 * Load all plugin settings (deferred until needed)
	 */
	async loadSettings() {
		if (this.settingsLoaded) {
			return; // Already loaded
		}

		try {
			const data = await this.loadData();

			// Extract all settings fields, ignore user data like recentEmojis and emojiJsonCache
			const settingsFromData: Partial<EmojiSelectorSettings> = {};
			if (data) {
				Object.keys(DEFAULT_SETTINGS).forEach(key => {
					if (key in data) {
						(settingsFromData as Record<string, unknown>)[key] = (data as Record<string, unknown>)[key];
					}
				});
			}

			this.settings = Object.assign({}, DEFAULT_SETTINGS, settingsFromData);
			this.settingsLoaded = true;

			// Apply dynamic CSS now that all settings are loaded
			this.updateEmojiSizeCSS();
		} catch (error) {
			console.error('Failed to load emoji selector settings:', error);
			this.settings = { ...DEFAULT_SETTINGS };
			this.settingsLoaded = true;

			// Apply default CSS even on error
			this.updateEmojiSizeCSS();
		}
	}

	/**
	 * Ensure settings are loaded before proceeding
	 */
	private async ensureSettingsLoaded(): Promise<void> {
		if (!this.settingsLoaded) {
			await this.loadSettings();
		}
	}

	/**
	 * Lazy initialization of EmojiManager (fully deferred until first use)
	 */
	private async getEmojiManager(): Promise<EmojiManager> {
		if (!this.emojiManager) {
			// Load settings now if not already loaded (first time accessing emoji functionality)
			await this.ensureSettingsLoaded();

			// Initialize emoji manager with cache support
			// Use specialized data access functions that only load what's needed
			this.emojiManager = new EmojiManager(
				this.settings,
				this.app,
				(data: unknown) => this.saveEmojiData(data),
				() => this.loadEmojiData()
			);
		}
		return this.emojiManager;
	}

	/**
	 * Load only emoji-related data (cache, recent emojis) without settings
	 */
	private async loadEmojiData(): Promise<Record<string, unknown>> {
		try {
			const data = await this.loadData();
			if (!data) return {};

			// Only return emoji-related data, not settings
			const emojiData: Record<string, unknown> = {};
			if (data.emojiJsonCache) {
				emojiData.emojiJsonCache = data.emojiJsonCache;
			}
			if (data.recentEmojis) {
				emojiData.recentEmojis = data.recentEmojis;
			}

			return emojiData;
		} catch (error) {
			console.error('Failed to load emoji data:', error);
			return {};
		}
	}

	/**
	 * Save emoji-related data while preserving settings
	 */
	private async saveEmojiData(emojiData: unknown): Promise<void> {
		try {
			const existingData = await this.loadData();
			const updatedData = {
				...(existingData as Record<string, unknown>),
				...(emojiData as Record<string, unknown>)
			};

			// Explicitly preserve all settings
			Object.keys(this.settings).forEach(key => {
				updatedData[key] = this.settings[key as keyof EmojiSelectorSettings];
			});

			await this.saveData(updatedData);
		} catch (error) {
			console.error('Failed to save emoji data:', error);
		}
	}

	/**
	 * Ensure CSS is injected when needed
	 */
	private ensureCSSInjected(): void {
		if (!this.cssInjected) {
			this.updateEmojiSizeCSS();
			this.cssInjected = true;
		}
	}

	/**
	 * Get emoji manager for settings tab (safe access)
	 */
	async getEmojiManagerForSettings(): Promise<EmojiManager> {
		// Ensure settings are loaded before creating emoji manager
		await this.ensureSettingsLoaded();
		const manager = await this.getEmojiManager();

		// Force update settings to ensure the manager has the latest settings
		// This is important because settings might have been changed after the manager was created
		manager.updateSettings(this.settings);

		return manager;
	}

	/**
	 * Check if emoji manager is initialized (for settings display)
	 */
	isEmojiManagerInitialized(): boolean {
		return this.emojiManager !== null;
	}

	/**
	 * Save plugin settings
	 */
	async saveSettings() {
		// Load existing data to preserve cache and other data
		const existingData = await this.loadData();

		// Check if URLs changed to clear cache
		const oldUrls = existingData?.owoJsonUrls;
		const newUrls = this.settings.owoJsonUrls;
		const urlsChanged = oldUrls !== newUrls;

		// Only update settings fields, preserve other data like recentEmojis, cache, etc.
		const updatedData = {
			...existingData
		};

		// If URLs changed, clear the emoji JSON cache from persistent storage
		if (urlsChanged && updatedData.emojiJsonCache) {
			delete updatedData.emojiJsonCache;
		}

		// Explicitly update only the settings fields to avoid overwriting user data
		Object.keys(this.settings).forEach(key => {
			updatedData[key] = this.settings[key as keyof EmojiSelectorSettings];
		});

		await this.saveData(updatedData);
		// Update emoji manager with new settings (always update if it exists)
		if (this.emojiManager) {
			this.emojiManager.updateSettings(this.settings);
		}
		// Note: If emojiManager doesn't exist yet, it will use the updated settings when created
		// because getEmojiManager() calls ensureSettingsLoaded() which loads the latest settings

		// Update dynamic CSS for emoji sizing
		this.updateEmojiSizeCSS();
		// Update emoji suggest registration
		await this.setupEmojiSuggest();
	}

	/**
	 * Open the emoji picker modal
	 */
	private async openEmojiPicker(editor: Editor): Promise<void> {
		// Ensure settings are loaded and CSS is injected before opening modal
		await this.ensureSettingsLoaded();
		this.ensureCSSInjected();

		// Get emoji manager (lazy initialization)
		await this.getEmojiManager();

		const modal = new EmojiPickerModal(
			this.app,
			this,
			(emoji: EmojiItem, isMultiSelectMode: boolean) => this.insertEmoji(editor, emoji, isMultiSelectMode)
		);
		modal.open();
	}

	/**
	 * Insert selected emoji into the editor
	 */
	private insertEmoji(editor: Editor, emoji: EmojiItem, isMultiSelectMode: boolean = false): void {
		const emojiHtml = this.generateEmojiHtml(emoji);

		// Determine if space should be added based on mode and settings
		const shouldAddSpace = isMultiSelectMode
			? this.settings.addSpaceAfterEmojiInMultiSelect
			: this.settings.addSpaceAfterEmoji;

		const textToInsert = shouldAddSpace ? emojiHtml + ' ' : emojiHtml;

		// Insert at current cursor position
		editor.replaceSelection(textToInsert);
	}

	/**
	 * Generate HTML for emoji insertion
	 * Handles both image and text-based emojis according to requirements 3.1 and 3.2
	 */
	private generateEmojiHtml(emoji: EmojiItem): string {
		// Use custom template if provided
		if (this.settings.customEmojiTemplate && this.settings.customEmojiTemplate.trim()) {
			return this.applyEmojiTemplate(emoji, this.settings.customEmojiTemplate);
		}

		// Default HTML generation
		const customClasses = this.settings.customCssClasses;

		if (emoji.type === 'image' && emoji.url) {
			// Generate HTML img tag for image emojis (Requirement 3.1)
			// Include proper alt text for accessibility (Requirement 3.2)
			// Size is controlled by dynamic CSS, no inline styles needed
			const classes = `emoji-image ${customClasses}`.trim();
			return `<img src="${this.sanitizeUrl(emoji.url)}" alt="${this.escapeHtml(emoji.text)}" title="${this.escapeHtml(emoji.text)}" class="${classes}">`;
		} else {
			// For text-based emojis, wrap in span for consistent styling
			// Size is controlled by dynamic CSS, no inline styles needed
			const classes = `emoji-text ${customClasses}`.trim();
			return `<span class="${classes}" title="${this.escapeHtml(emoji.text)}">${emoji.icon}</span>`;
		}
	}

	/**
	 * Sanitize URL to prevent XSS attacks
	 */
	private sanitizeUrl(url: string): string {
		// Basic URL validation and sanitization
		try {
			const parsedUrl = new URL(url);
			// Only allow http and https protocols
			if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
				return parsedUrl.toString();
			}
		} catch (error) {
			console.warn('Invalid emoji URL:', url);
		}
		// Return empty string for invalid URLs (will cause img to show alt text)
		return '';
	}

	/**
	 * Escape HTML characters to prevent XSS
	 */
	private escapeHtml(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

	/**
	 * Apply custom emoji template with variable substitution
	 */
	private applyEmojiTemplate(emoji: EmojiItem, template: string): string {
		const customClasses = this.settings.customCssClasses;
		const classes = emoji.type === 'image'
			? `emoji-image ${customClasses}`.trim()
			: `emoji-text ${customClasses}`.trim();

		// Get filename from url
		const fullfilename = emoji.url ? emoji.url.substring(emoji.url.lastIndexOf('/') + 1) : '';

		const dotIndex = fullfilename.lastIndexOf('.');
		const filename = dotIndex !== -1
			? fullfilename.substring(0, dotIndex)
			: fullfilename;
		// Create variables map
		const variables: Record<string, string> = {
			url: emoji.url ? this.sanitizeUrl(emoji.url) : '',
			name: emoji.key,
			text: this.escapeHtml(emoji.text),
			category: this.escapeHtml(emoji.category),
			type: emoji.type,
			classes: classes,
			icon: emoji.icon,
			filename: filename,
			fullfilename: fullfilename
		};

		// Replace variables in template
		let result = template;
		for (const [key, value] of Object.entries(variables)) {
			const regex = new RegExp(`\\{${key}\\}`, 'g');
			result = result.replace(regex, value);
		}

		return result;
	}

	/**
	 * Update dynamic CSS for emoji sizing
	 */
	private updateEmojiSizeCSS(): void {
		// Ensure settings are loaded before applying CSS
		if (!this.settingsLoaded) {
			// If settings aren't loaded yet, use default values
			const emojiSize = DEFAULT_SETTINGS.emojiSize;
			const customClasses = DEFAULT_SETTINGS.customCssClasses;
			this.applyCSSWithValues(emojiSize, customClasses);
			return;
		}

		const emojiSize = this.settings.emojiSize;
		const customClasses = this.settings.customCssClasses;
		this.applyCSSWithValues(emojiSize, customClasses);
	}

	/**
	 * Apply CSS with specific values
	 */
	private applyCSSWithValues(emojiSize: string, customClasses: string): void {
		// Remove existing dynamic style
		const existingStyle = document.getElementById('emoji-selector-dynamic-styles');
		if (existingStyle) {
			existingStyle.remove();
		}

		// Create new dynamic style
		const style = document.createElement('style');
		style.id = 'emoji-selector-dynamic-styles';

		// CSS that applies to all existing and new emojis - only dynamic sizing
		style.textContent = `
			/* Dynamic emoji sizing - overrides base styles */
			.emoji-image {
				height: ${emojiSize} !important;
				width: auto !important;
			}
			
			.emoji-text {
				font-size: ${emojiSize} !important;
			}
			
			/* Custom classes if specified */
			${customClasses ? `.emoji-image.${customClasses.split(' ').join(', .emoji-image.')},
			.emoji-text.${customClasses.split(' ').join(', .emoji-text.')} {
				/* Custom styling can be added here */
			}` : ''}
		`;

		document.head.appendChild(style);
		this.cssInjected = true;
	}
}