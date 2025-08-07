import { EditorSuggest, Editor, EditorPosition, TFile, EditorSuggestTriggerInfo, EditorSuggestContext } from 'obsidian';
import { EmojiItem } from './types';
import EmojiSelectorPlugin from '../main';

/**
 * EditorSuggest implementation for quick emoji insertion
 * Triggers when user types :emoji_name and shows a dropdown with matching emojis
 */
export class EmojiSuggest extends EditorSuggest<EmojiItem> {
    private plugin: EmojiSelectorPlugin;

    constructor(plugin: EmojiSelectorPlugin) {
        super(plugin.app);
        this.plugin = plugin;
        this.limit = 10; // Show up to 10 suggestions
    }

    /**
     * Determine if the suggest should be triggered based on cursor position
     * Triggers when user types : followed by at least one character
     */
    onTrigger(cursor: EditorPosition, editor: Editor, file: TFile | null): EditorSuggestTriggerInfo | null {
        // Check if quick insertion is enabled
        if (!this.plugin.settings.enableQuickInsertion) {
            return null;
        }
        // Get the current line text
        const line = editor.getLine(cursor.line);
        const beforeCursor = line.substring(0, cursor.ch);

        // Look for pattern like ":cry" or ":smile"
        // Match : followed by at least one alphanumeric character or underscore
        const match = beforeCursor.match(/:([a-zA-Z0-9_]+)$/);

        if (!match) {
            return null;
        }

        const query = match[1]; // The text after ":"
        const startPos = cursor.ch - match[0].length; // Position of ":"

        return {
            start: { line: cursor.line, ch: startPos },
            end: { line: cursor.line, ch: cursor.ch },
            query: query
        };
    }

    /**
     * Generate emoji suggestions based on the query
     */
    async getSuggestions(context: EditorSuggestContext): Promise<EmojiItem[]> {
        const { query } = context;

        // Ensure emoji manager is initialized
        const emojiManager = await this.plugin.getEmojiManagerForSettings();

        // Search for emojis matching the query
        const results = emojiManager.searchEmojis(query);

        // Limit results and prioritize exact matches
        return results
            .sort((a, b) => {
                // Prioritize exact key matches
                if (a.key === query && b.key !== query) return -1;
                if (b.key === query && a.key !== query) return 1;

                // Then prioritize key matches that start with query
                const aKeyStarts = a.key.toLowerCase().startsWith(query.toLowerCase());
                const bKeyStarts = b.key.toLowerCase().startsWith(query.toLowerCase());
                if (aKeyStarts && !bKeyStarts) return -1;
                if (bKeyStarts && !aKeyStarts) return 1;

                // Then prioritize text matches that start with query
                const aTextStarts = a.text.toLowerCase().startsWith(query.toLowerCase());
                const bTextStarts = b.text.toLowerCase().startsWith(query.toLowerCase());
                if (aTextStarts && !bTextStarts) return -1;
                if (bTextStarts && !aTextStarts) return 1;

                // Finally sort alphabetically by key
                return a.key.localeCompare(b.key);
            })
            .slice(0, this.limit);
    }

    /**
     * Render each suggestion item in the dropdown
     */
    renderSuggestion(emoji: EmojiItem, el: HTMLElement): void {
        el.addClass('emoji-suggest-item');

        // Create emoji preview
        const emojiPreview = el.createDiv('emoji-suggest-preview');
        if (emoji.type === 'image' && emoji.url) {
            const img = emojiPreview.createEl('img', {
                attr: {
                    src: emoji.url,
                    alt: emoji.text,
                    title: emoji.text
                },
                cls: 'emoji-suggest-image'
            });
            img.style.width = '20px';
            img.style.height = '20px';
            img.style.objectFit = 'contain';
        } else {
            const span = emojiPreview.createSpan({
                text: emoji.icon,
                cls: 'emoji-suggest-text'
            });
            span.style.fontSize = '20px';
        }

        // Create text info
        const textInfo = el.createDiv('emoji-suggest-info');
        const keyEl = textInfo.createDiv('emoji-suggest-key');
        keyEl.textContent = `:${emoji.key}:`;
        keyEl.style.fontWeight = 'bold';
        keyEl.style.color = 'var(--text-accent)';

        const descEl = textInfo.createDiv('emoji-suggest-desc');
        descEl.textContent = emoji.text;
        descEl.style.fontSize = '0.9em';
        descEl.style.color = 'var(--text-muted)';

        // Add category if available
        if (emoji.category) {
            const categoryEl = textInfo.createDiv('emoji-suggest-category');
            categoryEl.textContent = emoji.category;
            categoryEl.style.fontSize = '0.8em';
            categoryEl.style.color = 'var(--text-faint)';
        }
    }

    /**
     * Handle when user selects a suggestion
     */
    async selectSuggestion(emoji: EmojiItem, evt: MouseEvent | KeyboardEvent): Promise<void> {
        if (!this.context) return;

        const { editor } = this.context;

        // Generate the emoji HTML
        const emojiHtml = this.generateEmojiHtml(emoji);

        // Replace the trigger text (including the :) with the emoji
        editor.replaceRange(
            emojiHtml,
            this.context.start,
            this.context.end
        );

        // Add to recent emojis if enabled
        const emojiManager = await this.plugin.getEmojiManagerForSettings();
        await emojiManager.addToRecent(emoji);

        // Close the suggestion popup
        this.close();
    }

    /**
     * Generate HTML for emoji insertion (reuse from main plugin)
     */
    private generateEmojiHtml(emoji: EmojiItem): string {
        // Use custom template if provided
        if (this.plugin.settings.customEmojiTemplate && this.plugin.settings.customEmojiTemplate.trim()) {
            return this.applyEmojiTemplate(emoji, this.plugin.settings.customEmojiTemplate);
        }

        // Default HTML generation
        const customClasses = this.plugin.settings.customCssClasses;

        if (emoji.type === 'image' && emoji.url) {
            // Generate HTML img tag for image emojis
            const classes = `emoji-image ${customClasses}`.trim();
            return `<img src="${this.sanitizeUrl(emoji.url)}" alt="${this.escapeHtml(emoji.text)}" title="${this.escapeHtml(emoji.text)}" class="${classes}">`;
        } else {
            // For text-based emojis, wrap in span for consistent styling
            const classes = `emoji-text ${customClasses}`.trim();
            return `<span class="${classes}" title="${this.escapeHtml(emoji.text)}">${emoji.icon}</span>`;
        }
    }

    /**
     * Apply custom emoji template with variable substitution
     */
    private applyEmojiTemplate(emoji: EmojiItem, template: string): string {
        const customClasses = this.plugin.settings.customCssClasses;
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
     * Sanitize URL to prevent XSS attacks
     */
    private sanitizeUrl(url: string): string {
        try {
            const parsedUrl = new URL(url);
            if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
                return parsedUrl.toString();
            }
        } catch (error) {
            console.warn('Invalid emoji URL:', url);
        }
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
}