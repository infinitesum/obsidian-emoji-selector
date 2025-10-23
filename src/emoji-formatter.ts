import { EmojiItem, EmojiSelectorSettings } from './types';

/**
 * Utility class for formatting emoji output
 * Shared between main plugin and emoji-suggest
 */
export class EmojiFormatter {
    /**
     * Generate HTML/Wiki-link for emoji insertion
     */
    public static generateEmojiHtml(emoji: EmojiItem, settings: EmojiSelectorSettings): string {
        // 本地图片使用本地模板,留空则使用默认模板
        if (emoji.originalPath) {
            const localTemplate = settings.customLocalEmojiTemplate || 
                '<img src="{path}" alt="{text}" title="{text}" class="{classes}">';
            return this.applyEmojiTemplate(emoji, localTemplate);
        }
        
        // 远程图片使用远程模板,留空则使用标准 HTML
        const remoteTemplate = settings.customEmojiTemplate || 
            '<img src="{url}" alt="{text}" title="{text}" class="{classes}">';
        return this.applyEmojiTemplate(emoji, remoteTemplate);
    }

    /**
     * Apply custom emoji template with variable substitution
     */
    private static applyEmojiTemplate(emoji: EmojiItem, template: string): string {
        // Only calculate filename if template uses these variables (performance optimization)
        let filename = '', fullfilename = '';
        if (template.includes('{filename}') || template.includes('{fullfilename}')) {
            // Determine the source for filename extraction (prefer originalPath for local images)
            const sourceForFilename = emoji.originalPath || emoji.url || '';
            fullfilename = sourceForFilename ? sourceForFilename.substring(sourceForFilename.lastIndexOf('/') + 1) : '';
            const dotIndex = fullfilename.lastIndexOf('.');
            filename = dotIndex !== -1
                ? fullfilename.substring(0, dotIndex)
                : fullfilename;
        }

        // Create variables map
        const variables: Record<string, string> = {
            url: emoji.url ? this.sanitizeUrl(emoji.url) : '',
            path: emoji.originalPath ? this.escapeHtml(emoji.originalPath) : '', // Local path for vault images
            name: emoji.key,
            text: this.escapeHtml(emoji.text),
            category: this.escapeHtml(emoji.category),
            type: emoji.type,
            classes: emoji.type === 'image' ? 'emoji-image' : 'emoji-text',
            icon: emoji.icon,
            filename: filename,
            fullfilename: fullfilename
        };

        let result = template;
        for (const [key, value] of Object.entries(variables)) {
            result = result.split(`{${key}}`).join(value);
        }

        return result;
    }

    /**
     * Sanitize URL to prevent XSS attacks
     */
    private static sanitizeUrl(url: string): string {
        // Validate remote URLs
        if (url.startsWith('http://') || url.startsWith('https://')) {
            try {
                const parsedUrl = new URL(url);
                if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
                    return parsedUrl.toString();
                }
            } catch (error) {
                console.warn('Invalid emoji URL:', url);
                return '';
            }
        }
        
        // For local paths (app:// or relative), return as-is
        return url;
    }

    /**
     * Escape HTML characters to prevent XSS
     */
    private static escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}
