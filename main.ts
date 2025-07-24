import { Plugin, Editor, MarkdownView, Notice, Modifier } from 'obsidian';
import { EmojiPickerModal } from './src/emoji-picker-modal';
import { EmojiItem, EmojiSelectorSettings, DEFAULT_SETTINGS } from './src/types';
import { EmojiManager } from './src/emoji-manager';
import { EmojiSelectorSettingTab } from './src/settings-tab';

export default class EmojiSelectorPlugin extends Plugin {
	settings: EmojiSelectorSettings;
	emojiManager: EmojiManager | null = null;
	private settingsLoaded: boolean = false;
	private settingsLoadPromise: Promise<void> | null = null;
	private cssInjected: boolean = false;

	async onload() {

		// Start loading settings in background (non-blocking)
		this.loadSettingsAsync();

		// Add settings tab (Requirement 5.4) - can be added immediately
		this.addSettingTab(new EmojiSelectorSettingTab(this.app, this));

		// Add command to open emoji picker (Requirement 5.1) - defer hotkey setup
		this.addCommand({
			id: 'open-picker',
			name: 'Open Emoji Picker',
			editorCallback: async (editor: Editor) => {
				await this.openEmojiPicker(editor);
			}
			// Hotkeys will be set up after settings load
		});

		// Add ribbon icon to trigger emoji picker (Requirement 5.2)
		this.addRibbonIcon('smile', 'Open Emoji Picker', async () => {
			// Get the active editor
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView && activeView.editor) {
				await this.openEmojiPicker(activeView.editor);
			} else {
				// Show notice if no active editor
				new Notice('No active editor found. Please open a note to use the emoji picker.');
			}
		});

		// Inject base CSS immediately so existing emojis look good
		// Dynamic sizing CSS will be injected later when settings are loaded
		this.injectBaseCss();
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
	 * Load plugin settings asynchronously (non-blocking)
	 */
	private loadSettingsAsync(): void {
		if (this.settingsLoadPromise) {
			return;
		}

		this.settingsLoadPromise = this.loadSettings();
	}

	/**
	 * Load plugin settings
	 */
	async loadSettings() {
		try {
			this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
			this.settingsLoaded = true;

			// Set up hotkeys now that settings are loaded
			this.setupHotkeys();

			// Apply dynamic CSS now that settings are loaded
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
		if (!this.settingsLoaded && this.settingsLoadPromise) {
			await this.settingsLoadPromise;
		}
	}

	/**
	 * Setup hotkeys after settings are loaded
	 */
	private setupHotkeys(): void {
		// Find the existing command and update its hotkeys
		const command = (this.app as any).commands.commands['emoji-selector:open-picker'];
		if (command && this.settings.enableKeyboardShortcut) {
			command.hotkeys = [
				{
					modifiers: this.parseHotkey(this.settings.keyboardShortcut).modifiers as Modifier[],
					key: this.parseHotkey(this.settings.keyboardShortcut).key
				}
			];
		} else if (command) {
			command.hotkeys = [];
		}
	}

	/**
	 * Lazy initialization of EmojiManager
	 */
	private async getEmojiManager(): Promise<EmojiManager> {
		if (!this.emojiManager) {
			// Ensure settings are loaded first
			await this.ensureSettingsLoaded();

			// Initialize emoji manager with cache support
			this.emojiManager = new EmojiManager(
				this.settings,
				(data: any) => this.saveData(data),
				() => this.loadData()
			);
		}
		return this.emojiManager;
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
		// Base emoji CSS injected
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
		const updatedData = {
			...existingData,
			...this.settings
		};
		await this.saveData(updatedData);
		// Update emoji manager with new settings
		if (this.emojiManager) {
			this.emojiManager.updateSettings(this.settings);
		}
		// Update hotkeys
		this.setupHotkeys();
		// Update dynamic CSS for emoji sizing
		this.updateEmojiSizeCSS();
	}

	/**
	 * Open the emoji picker modal
	 */
	private async openEmojiPicker(editor: Editor): Promise<void> {
		// Ensure CSS is injected before opening modal
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

		// Create variables map
		const variables: Record<string, string> = {
			url: emoji.url ? this.sanitizeUrl(emoji.url) : '',
			name: emoji.key,
			text: this.escapeHtml(emoji.text),
			category: this.escapeHtml(emoji.category),
			type: emoji.type,
			classes: classes,
			icon: emoji.icon
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
	 * Parse hotkey string into modifiers and key
	 */
	private parseHotkey(hotkeyString: string): { modifiers: string[], key: string } {
		const parts = hotkeyString.split('+').map(part => part.trim());
		const key = parts.pop() || '';
		const modifiers: string[] = [];

		for (const part of parts) {
			switch (part.toLowerCase()) {
				case 'ctrl':
				case 'control':
					modifiers.push('Mod');
					break;
				case 'shift':
					modifiers.push('Shift');
					break;
				case 'alt':
					modifiers.push('Alt');
					break;
				case 'cmd':
				case 'meta':
					modifiers.push('Meta');
					break;
			}
		}

		return { modifiers, key: key.toLowerCase() };
	}

	/**
	 * Update dynamic CSS for emoji sizing
	 */
	private updateEmojiSizeCSS(): void {
		// Ensure settings are loaded before applying CSS
		if (!this.settingsLoaded) {
			// If settings aren't loaded yet, defer this call
			setTimeout(() => this.updateEmojiSizeCSS(), 100);
			return;
		}

		// Remove existing dynamic style
		const existingStyle = document.getElementById('emoji-selector-dynamic-styles');
		if (existingStyle) {
			existingStyle.remove();
		}

		// Create new dynamic style
		const style = document.createElement('style');
		style.id = 'emoji-selector-dynamic-styles';

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
		this.cssInjected = true;
		// Dynamic emoji CSS updated
	}
}