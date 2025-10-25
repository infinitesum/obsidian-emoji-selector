import { Plugin, Editor, MarkdownView, Notice } from 'obsidian';
import { EmojiPickerModal } from './src/emoji-picker-modal';
import { EmojiItem, EmojiSelectorSettings, DEFAULT_SETTINGS } from './src/types';
import { EmojiManager } from './src/emoji-manager';
import { EmojiSelectorSettingTab } from './src/settings-tab';
import { EmojiSuggest } from './src/emoji-suggest';
import { EmojiFormatter } from './src/emoji-formatter';
import { i18n } from './src/i18n';
import { perfMonitor } from './src/performance-monitor';
import { logger, LogLevel } from './src/logger';

export default class EmojiSelectorPlugin extends Plugin {
	settings: EmojiSelectorSettings;
	emojiManager: EmojiManager | null = null;
	private emojiSuggest: EmojiSuggest | null = null;
	private dataCache: Record<string, unknown> | null = null;

	async onload() {
		perfMonitor.start('plugin-onload');

		await this.loadSettings();

		logger.setLogLevel(this.settings.debugLogLevel as LogLevel);

		// Add settings tab (Requirement 5.4) 
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
				new Notice(i18n.t('noActiveCollection'));
			}
		});

		// Register emoji suggest for quick insertion based on settings
		this.setupEmojiSuggest();

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
	 * Setup emoji suggest based on settings
	 */
	private setupEmojiSuggest(): void {
		if (this.settings.enableQuickInsertion) {
			if (!this.emojiSuggest) {
				this.emojiSuggest = new EmojiSuggest(this);
				this.registerEditorSuggest(this.emojiSuggest);
			}
		} else {
			if (this.emojiSuggest) {
				this.emojiSuggest = null;
			}
		}
	}

	/**
	 * Load all plugin settings (deferred until needed)
	 */
	async loadSettings() {
		try {
			const data = await this.loadData();
			// Cache the complete data
			this.dataCache = data || {};

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

			// Apply dynamic CSS now that all settings are loaded
			this.updateEmojiSizeCSS();
		} catch (error) {
			console.error('Failed to load emoji selector settings:', error);
			this.settings = { ...DEFAULT_SETTINGS };
			this.dataCache = {};

			// Apply default CSS even on error
			this.updateEmojiSizeCSS();
		}
	}

	/**
	 * Lazy initialization of EmojiManager (fully deferred until first use)
	 */
	private async getEmojiManager(): Promise<EmojiManager> {
		if (!this.emojiManager) {
			// Initialize emoji manager with cache support
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
	 * Uses cached data to avoid repeated disk reads
	 */
	private async loadEmojiData(): Promise<Record<string, unknown>> {
		try {
			const data = this.dataCache || await this.loadData();
			
			if (!this.dataCache) {
				this.dataCache = data || {};
			}
			
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
	 * Uses cached data to avoid repeated disk reads
	 */
	private async saveEmojiData(emojiData: unknown): Promise<void> {
		try {
			
			const existingData = this.dataCache || await this.loadData();
			
			const updatedData = {
				...(existingData as Record<string, unknown>),
				...(emojiData as Record<string, unknown>)
			};

			// Explicitly preserve all settings
			Object.keys(this.settings).forEach(key => {
				updatedData[key] = this.settings[key as keyof EmojiSelectorSettings];
			});

			await this.saveData(updatedData);
			// Update cache after successful save
			this.dataCache = updatedData;
		} catch (error) {
			console.error('Failed to save emoji data:', error);
		}
	}

	/**
	 * Get emoji manager for settings tab (safe access)
	 */
	async getEmojiManagerForSettings(): Promise<EmojiManager> {
		const manager = await this.getEmojiManager();

		// Force update settings
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
	 * Uses cached data to avoid repeated disk reads
	 */
	async saveSettings() {
		// Use cached data if available, otherwise load from disk
		const existingData = this.dataCache || await this.loadData();

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
		// Update cache after successful save
		this.dataCache = updatedData;
		
		// Update emoji manager with new settings (always update if it exists)
		if (this.emojiManager) {
			this.emojiManager.updateSettings(this.settings);
		}
		// Note: If emojiManager doesn't exist yet, it will use the updated settings when created

		// Update dynamic CSS for emoji sizing
		this.updateEmojiSizeCSS();
		// Update emoji suggest registration
		this.setupEmojiSuggest();
	}

	/**
	 * Open the emoji picker modal
	 */
	private async openEmojiPicker(editor: Editor): Promise<void> {
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
		const emojiHtml = EmojiFormatter.generateEmojiHtml(emoji, this.settings);

		// Determine if space should be added based on mode and settings
		const shouldAddSpace = isMultiSelectMode
			? this.settings.addSpaceAfterEmojiInMultiSelect
			: this.settings.addSpaceAfterEmoji;

		const textToInsert = shouldAddSpace ? emojiHtml + ' ' : emojiHtml;

		// Insert at current cursor position
		editor.replaceSelection(textToInsert);
	}

	/**
	 * Update dynamic CSS for emoji sizing
	 */
	private updateEmojiSizeCSS(): void {
		// Remove existing dynamic style
		const existingStyle = document.getElementById('emoji-selector-dynamic-styles');
		if (existingStyle) {
			existingStyle.remove();
		}

		// Create new dynamic style
		const style = createEl('style', {
			attr: { id: 'emoji-selector-dynamic-styles' }
		});
		
		const emojiSize = this.settings.emojiSize;
		const customClasses = this.settings.customCssClasses;
		
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
	}
}