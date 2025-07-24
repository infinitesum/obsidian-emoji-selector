/**
 * Core data structures and interfaces for the Emoji Selector Plugin
 */

/**
 * Represents a single emoji item with its metadata
 */
export interface EmojiItem {
    /** Unique identifier for the emoji */
    key: string;
    /** Display icon (text emoji, unicode, or URL for images) */
    icon: string;
    /** Alt text or description for accessibility */
    text: string;
    /** Type of emoji content */
    type: 'emoticon' | 'emoji' | 'image';
    /** Collection category this emoji belongs to */
    category: string;
    /** Optional URL for image type emojis */
    url?: string;
}

/**
 * Represents a collection of emojis from a single source
 */
export interface EmojiCollection {
    /** Name of the collection */
    name: string;
    /** Type of emojis in this collection */
    type: 'emoticon' | 'emoji' | 'image';
    /** Array of emoji items in this collection */
    items: EmojiItem[];
    /** Source file path where this collection was loaded from */
    source: string;
}

/**
 * Cached JSON data for a URL
 */
export interface CachedJsonData {
    /** The URL this data was fetched from */
    url: string;
    /** The raw JSON data */
    data: any;
    /** Timestamp when this data was cached */
    cachedAt: number;
    /** ETag or other cache validation header */
    etag?: string;
}

/**
 * Cache storage for emoji JSON files
 */
export interface EmojiJsonCache {
    /** Map of URL to cached data */
    [url: string]: CachedJsonData;
}

/**
 * Plugin settings interface
 */
export interface EmojiSelectorSettings {
    /** CSS height for emoji display (width is auto) */
    emojiSize: string;
    /** Search input placeholder text */
    searchPlaceholder: string;
    /** Enable keyboard shortcut */
    enableKeyboardShortcut: boolean;
    /** Keyboard shortcut string */
    keyboardShortcut: string;
    /** Additional CSS classes for styling */
    customCssClasses: string;
    /** URLs for owo.json files (comma-separated) */
    owoJsonUrls: string;
    /** Remember last selected collection */
    rememberLastCollection: boolean;
    /** Last selected emoji collection */
    lastSelectedCollection: string;
    /** Add space after emoji insertion in single-select mode */
    addSpaceAfterEmoji: boolean;
    /** Add space after emoji insertion in multi-select mode */
    addSpaceAfterEmojiInMultiSelect: boolean;
    /** Custom emoji insertion template with variables */
    customEmojiTemplate: string;
}

/**
 * Default plugin settings
 */
export const DEFAULT_SETTINGS: EmojiSelectorSettings = {
    emojiSize: '2em',
    searchPlaceholder: '',
    enableKeyboardShortcut: false,
    keyboardShortcut: '',
    customCssClasses: '',
    owoJsonUrls: '',
    rememberLastCollection: true,
    lastSelectedCollection: 'all',
    addSpaceAfterEmoji: true,
    addSpaceAfterEmojiInMultiSelect: false,
    customEmojiTemplate: ''
};