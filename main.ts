import { Plugin, Editor, MarkdownView, Notice, Modifier } from 'obsidian';
import { EmojiPickerModal } from './src/emoji-picker-modal';
import { EmojiItem, EmojiSelectorSettings, DEFAULT_SETTINGS } from './src/types';
import { EmojiManager } from './src/emoji-manager';
import { EmojiSelectorSettingTab } from './src/settings-tab';

export default class EmojiSelectorPlugin extends Plugin {
	settings: EmojiSelectorSettings;
	emojiManager: EmojiManager;

	async onload() {
		console.log('Loading Emoji Selector Plugin');

		// Load settings
		await this.loadSettings();

		// Initialize emoji manager with cache support
		this.emojiManager = new EmojiManager(
			this.settings,
			(data: any) => this.saveData(data),
			() => this.loadData()
		);

		// Add settings tab (Requirement 5.4)
		this.addSettingTab(new EmojiSelectorSettingTab(this.app, this));

		// Add command to open emoji picker (Requirement 5.1)
		this.addCommand({
			id: 'open-emoji-picker',
			name: 'Open Emoji Picker',
			editorCallback: (editor: Editor) => {
				this.openEmojiPicker(editor);
			},
			hotkeys: this.settings.enableKeyboardShortcut ? [
				{
					modifiers: this.parseHotkey(this.settings.keyboardShortcut).modifiers as Modifier[],
					key: this.parseHotkey(this.settings.keyboardShortcut).key
				}
			] : []
		});

		// Add ribbon icon to trigger emoji picker (Requirement 5.2)
		this.addRibbonIcon('smile', 'Open Emoji Picker', () => {
			// Get the active editor
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView && activeView.editor) {
				this.openEmojiPicker(activeView.editor);
			} else {
				// Show notice if no active editor
				new Notice('No active editor found. Please open a note to use the emoji picker.');
			}
		});

		// Apply dynamic CSS for emoji sizing
		this.updateEmojiSizeCSS();
	}

	onunload() {
		console.log('Unloading Emoji Selector Plugin');
	}

	/**
	 * Load plugin settings
	 */
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
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
		// Update dynamic CSS for emoji sizing
		this.updateEmojiSizeCSS();
	}

	/**
	 * Open the emoji picker modal
	 */
	private openEmojiPicker(editor: Editor): void {
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
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
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

		// CSS that applies to all existing and new emojis
		style.textContent = `
			/* Dynamic emoji sizing - applies to all emojis */
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