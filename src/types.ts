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
    data: unknown;
    /** Timestamp when this data was cached */
    cachedAt: number;
    /** ETag or other cache validation header */
    etag?: string;
}

// Use Obsidian's App type directly - imported where needed

/**
 * Cache storage for emoji JSON files
 */
export interface EmojiJsonCache {
    /** Map of URL to cached data */
    [url: string]: CachedJsonData;
}

/**
 * Recent emoji entry with usage metadata
 */
export interface RecentEmojiEntry {
    /** The emoji item */
    emoji: EmojiItem;
    /** Last used timestamp */
    lastUsed: number;
    /** Usage count */
    count: number;
}

/**
 * Recent emojis storage data
 */
export interface RecentEmojisData {
    /** Map of emoji key to recent entry */
    entries: Record<string, RecentEmojiEntry>;
    /** Ordered list of emoji keys by recency */
    order: string[];
}

/**
 * Plugin settings interface
 */
export interface EmojiSelectorSettings {
    /** CSS height for emoji display (width is auto) */
    emojiSize: string;
    /** Search input placeholder text */
    searchPlaceholder: string;
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
    /** Maximum number of recent emojis to keep */
    maxRecentEmojis: number;
    /** Enable recent emojis feature */
    enableRecentEmojis: boolean;
    /** Prefer recent emojis over remembered collection when opening picker */
    preferRecentOverRemembered: boolean;
    /** Enable quick emoji insertion with :emoji_name syntax */
    enableQuickInsertion: boolean;
    /** Trigger string(s) for quick insertion. Use | to separate multiple alternatives (e.g., "::|：：" matches both :: and ：：) */
    quickInsertionTrigger: string;
    /** Enable regex search support */
    enableRegexSearch: boolean;
    /** Enable fuzzy search support */
    enableFuzzySearch: boolean;
    /** Debug logging level (0=DEBUG, 1=INFO, 2=WARN, 3=ERROR, 4=NONE) */
    debugLogLevel: number;
}

/**
 * Default plugin settings
 */
export const DEFAULT_SETTINGS: EmojiSelectorSettings = {
    emojiSize: '2rem',
    searchPlaceholder: '',
    customCssClasses: '',
    owoJsonUrls: 'https://raw.githubusercontent.com/infinitesum/Twikoo-emoji/refs/heads/main/capoo.json',
    rememberLastCollection: true,
    lastSelectedCollection: 'all',
    addSpaceAfterEmoji: true,
    addSpaceAfterEmojiInMultiSelect: false,
    customEmojiTemplate: '',
    maxRecentEmojis: 20,
    enableRecentEmojis: true,
    preferRecentOverRemembered: true,
    enableQuickInsertion: true,
    quickInsertionTrigger: '::|：：',
    enableRegexSearch: false,
    enableFuzzySearch: false,
    debugLogLevel: 2 // Default to WARN level
};