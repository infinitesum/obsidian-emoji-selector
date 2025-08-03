import { Plugin, Editor, MarkdownView, Notice } from 'obsidian';
import { EmojiPickerModal } from './src/emoji-picker-modal';
import { EmojiItem, EmojiSelectorSettings, DEFAULT_SETTINGS } from './src/types';
import { EmojiManager } from './src/emoji-manager';
import { EmojiSelectorSettingTab } from './src/settings-tab';
import { i18n } from './src/i18n';
import { perfMonitor } from './src/performance-monitor';

export default class EmojiSelectorPlugin extends Plugin {
	settings: EmojiSelectorSettings;
	emojiManager: EmojiManager | null = null;
	private settingsLoaded: boolean = false;
	private settingsLoadPromise: Promise<void> | null = null;
	private cssInjected: boolean = false;

	async onload() {
		perfMonitor.start('plugin-onload');

		// Use default settings on startup to avoid reading large data.json file
		// All settings will be loaded lazily when first needed
		this.settings = { ...DEFAULT_SETTINGS };
		this.settingsLoaded = false;

		// Apply default CSS immediately for existing emojis
		this.updateEmojiSizeCSS();

		// Add settings tab (Requirement 5.4) - can be added immediately
		this.addSettingTab(new EmojiSelectorSettingTab(this.app, this));

		// Add command to open emoji picker (Requirement 5.1)
		this.addCommand({
			id: 'open-picker',
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

		// Inject base CSS immediately so existing emojis look good
		// Dynamic sizing CSS will be injected later when settings are loaded
		this.injectBaseCss();

		perfMonitor.end('plugin-onload');
		perfMonitor.logMetrics();
	}

	onunload() {

		// Clean up injected CSS
		const baseStyle = document.getElementById('emoji-selector-base-styles');
		if (baseStyle) {
			baseStyle.remove();
		}

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
	 * Load all plugin settings (deferred until needed)
	 */
	async loadSettings() {
		if (this.settingsLoaded) {
			return; // Already loaded
		}

		try {
			const data = await this.loadData();

			// Extract all settings fields, ignore user data like recentEmojis and emojiJsonCache
			const settingsFromData: any = {};
			if (data) {
				Object.keys(DEFAULT_SETTINGS).forEach(key => {
					if (key in data) {
						settingsFromData[key] = data[key];
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
				(data: any) => this.saveEmojiData(data),
				() => this.loadEmojiData()
			);
		}
		return this.emojiManager;
	}

	/**
	 * Load only emoji-related data (cache, recent emojis) without settings
	 */
	private async loadEmojiData(): Promise<any> {
		try {
			const data = await this.loadData();
			if (!data) return {};

			// Only return emoji-related data, not settings
			const emojiData: any = {};
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
	private async saveEmojiData(emojiData: any): Promise<void> {
		try {
			const existingData = await this.loadData();
			const updatedData = {
				...existingData,
				...emojiData
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
	 * Inject base CSS immediately for existing emojis
	 */
	private injectBaseCss(): void {
		// Check if base CSS is already injected
		if (document.getElementById('emoji-selector-base-styles')) {
			return;
		}

		const style = document.createElement('style');
		style.id = 'emoji-selector-base-styles';

		// Base CSS that makes emojis look good regardless of settings
		style.textContent = `
			/* Base emoji styles - applied to all emoji elements */
			.emoji-image,
			.emoji-text {
				display: inline;
				vertical-align: text-bottom;
				line-height: 1;
				margin: 0 0.05em;
				user-select: none;
				-webkit-user-select: none;
				-moz-user-select: none;
				-ms-user-select: none;
			}

			/* Image emoji specific styles */
			.emoji-image {
				object-fit: contain;
				border-radius: var(--radius-xs);
				background: transparent;
				border: none;
				outline: none;
				max-width: none;
				width: auto;
				height: 1.2em; /* Default size, will be overridden by dynamic CSS */
				pointer-events: none;
				-webkit-user-drag: none;
				-khtml-user-drag: none;
				-moz-user-drag: none;
				-o-user-drag: none;
			}

			/* Text emoji specific styles */
			.emoji-text {
				font-style: normal;
				font-weight: normal;
				text-decoration: none;
				font-size: 1.2em; /* Default size, will be overridden by dynamic CSS */
				font-family: var(--font-text), "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif;
			}

			/* Ensure proper alignment in different contexts */
			.cm-editor .emoji-image,
			.cm-editor .emoji-text {
				display: inline;
				vertical-align: text-bottom;
				position: relative;
				top: 0;
			}

			.markdown-preview-view .emoji-image,
			.markdown-preview-view .emoji-text,
			.markdown-reading-view .emoji-image,
			.markdown-reading-view .emoji-text,
			.markdown-source-view.mod-cm6 .emoji-image,
			.markdown-source-view.mod-cm6 .emoji-text {
				vertical-align: middle;
			}

			/* Fallback for broken images */
			.emoji-image[alt]:after {
				content: attr(alt);
				font-size: 0.8em;
				color: var(--text-muted);
				background: var(--background-secondary);
				padding: 0.1em 0.3em;
				border-radius: var(--radius-xs);
				border: 1px solid var(--background-modifier-border);
				display: inline-block;
				vertical-align: middle;
			}

			.emoji-image {
				color: transparent;
				display: inline !important;
			}

			/* Optimized event handling styles */
			.emoji-container {
				outline: none;
			}

			.emoji-container:focus {
				outline: 2px solid var(--interactive-accent);
				outline-offset: 2px;
			}

			.emoji-item {
				cursor: pointer;
				border-radius: var(--radius-s);
				transition: background-color 0.1s ease;
			}

			.emoji-item:hover {
				background-color: var(--background-modifier-hover);
			}

			.emoji-item.emoji-selected {
				background-color: var(--interactive-accent);
				color: var(--text-on-accent);
			}

			.emoji-item.emoji-selected .emoji-text {
				color: var(--text-on-accent);
			}
		`;

		document.head.appendChild(style);
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
		return await this.getEmojiManager();
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
		// Update emoji manager with new settings
		if (this.emojiManager) {
			this.emojiManager.updateSettings(this.settings);
		}
		// Update dynamic CSS for emoji sizing
		this.updateEmojiSizeCSS();
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