import { EditorSuggest, Editor, EditorPosition, TFile, EditorSuggestTriggerInfo, EditorSuggestContext } from 'obsidian';
import { EmojiItem } from './types';
import EmojiSelectorPlugin from '../main';

/**
 * EditorSuggest implementation for quick emoji insertion
 * Triggers when user types :emoji_name and shows a dropdown with matching emojis
 */
export class EmojiSuggest extends EditorSuggest<EmojiItem> {
    private plugin: EmojiSelectorPlugin;
    private triggerRegex: RegExp | null = null;
    private lastConfig: string = '';

    constructor(plugin: EmojiSelectorPlugin) {
        super(plugin.app);
        this.plugin = plugin;
        this.limit = 50;
    }

    onTrigger(cursor: EditorPosition, editor: Editor, file: TFile | null): EditorSuggestTriggerInfo | null {
        if (!this.plugin.settings.enableQuickInsertion) {
            return null;
        }

        // Build/update regex only when config changes
        const config = this.plugin.settings.quickInsertionTrigger || '::|：：';
        if (config !== this.lastConfig) {
            this.lastConfig = config;
            // Escape special regex chars and build pattern: (trigger1|trigger2|...)([^\s]*)$
            const escaped = config.replace(/[.*+?^${}()[\]\\]/g, '\\$&');
            this.triggerRegex = new RegExp(`(${escaped})([^\\s]*)$`);
        }

        if (!this.triggerRegex) return null;

        const beforeCursor = editor.getLine(cursor.line).substring(0, cursor.ch);
        const match = beforeCursor.match(this.triggerRegex);

        if (match) {
            return {
                start: { line: cursor.line, ch: cursor.ch - match[0].length },
                end: { line: cursor.line, ch: cursor.ch },
                query: match[2]
            };
        }

        return null;
    }

    /**
     * Generate emoji suggestions based on the query with advanced search support
     */
    async getSuggestions(context: EditorSuggestContext): Promise<EmojiItem[]> {
        const { query } = context;

        // Ensure emoji manager is initialized
        const emojiManager = await this.plugin.getEmojiManagerForSettings();

        // Ensure emoji collections are loaded before searching
        // This is critical for quick insertion to work immediately after plugin load
        if (emojiManager.getTotalEmojiCount() === 0) {
            try {
                await emojiManager.loadEmojiCollections();
            } catch (error) {
                console.warn('Failed to load emoji collections for quick insertion:', error);
                return []; // Return empty array if loading fails
            }
        }

        // Use advanced search for better results (supports regex, fuzzy matching, collection filtering)
        const results = emojiManager.advancedSearchWithCollections(query);

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
            // Styles are now handled by CSS class 'emoji-suggest-image'
        } else {
            const span = emojiPreview.createSpan({
                text: emoji.icon,
                cls: 'emoji-suggest-text'
            });
            // Styles are now handled by CSS class 'emoji-suggest-text'
        }

        // Create text info
        const textInfo = el.createDiv('emoji-suggest-info');
        const keyEl = textInfo.createDiv('emoji-suggest-key');
        keyEl.textContent = `:${emoji.key}:`;
        // Styles are now handled by CSS class 'emoji-suggest-key'

        const descEl = textInfo.createDiv('emoji-suggest-desc');
        descEl.textContent = emoji.text;
        // Styles are now handled by CSS class 'emoji-suggest-desc'

        // Add category if available
        if (emoji.category) {
            const categoryEl = textInfo.createDiv('emoji-suggest-category');
            categoryEl.textContent = emoji.category;
            // Styles are now handled by CSS class 'emoji-suggest-category'
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

        // Add space after emoji if enabled in single-select mode setting
        const shouldAddSpace = this.plugin.settings.addSpaceAfterEmoji;
        const textToInsert = shouldAddSpace ? emojiHtml + ' ' : emojiHtml;

        // Replace the trigger text (including the :) with the emoji
        editor.replaceRange(
            textToInsert,
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