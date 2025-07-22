import { EmojiItem, EmojiCollection } from './types';

/**
 * Simple in-memory storage for emoji collections
 */
export class EmojiStorage {
    private collections: Map<string, EmojiCollection> = new Map();
    private allEmojis: EmojiItem[] = [];
    private emojiIndex: Map<string, EmojiItem> = new Map();

    /**
     * Add a collection to storage
     */
    addCollection(collection: EmojiCollection): void {
        this.collections.set(collection.name, collection);
        this.rebuildIndex();
    }

    /**
     * Remove a collection from storage
     */
    removeCollection(name: string): void {
        this.collections.delete(name);
        this.rebuildIndex();
    }

    /**
     * Get a collection by name
     */
    getCollection(name: string): EmojiCollection | undefined {
        return this.collections.get(name);
    }

    /**
     * Get all collections
     */
    getAllCollections(): EmojiCollection[] {
        return Array.from(this.collections.values());
    }

    /**
     * Get all emojis from all collections
     */
    getAllEmojis(): EmojiItem[] {
        return [...this.allEmojis];
    }

    /**
     * Get emoji by key
     */
    getEmojiByKey(key: string): EmojiItem | undefined {
        return this.emojiIndex.get(key);
    }

    /**
     * Search emojis by query (searches in key, text, and category)
     */
    searchEmojis(query: string): EmojiItem[] {
        if (!query.trim()) {
            return this.getAllEmojis();
        }

        const searchTerm = query.toLowerCase().trim();
        return this.allEmojis.filter(emoji => 
            emoji.key.toLowerCase().includes(searchTerm) ||
            emoji.text.toLowerCase().includes(searchTerm) ||
            emoji.category.toLowerCase().includes(searchTerm)
        );
    }

    /**
     * Clear all collections and emojis
     */
    clear(): void {
        this.collections.clear();
        this.allEmojis = [];
        this.emojiIndex.clear();
    }

    /**
     * Get total number of emojis across all collections
     */
    getTotalEmojiCount(): number {
        return this.allEmojis.length;
    }

    /**
     * Get total number of collections
     */
    getCollectionCount(): number {
        return this.collections.size;
    }

    /**
     * Rebuild the emoji index and all emojis array
     */
    private rebuildIndex(): void {
        this.allEmojis = [];
        this.emojiIndex.clear();

        for (const collection of this.collections.values()) {
            for (const emoji of collection.items) {
                this.allEmojis.push(emoji);
                this.emojiIndex.set(emoji.key, emoji);
            }
        }
    }
}
/**
 * 
Validation functions for emoji data
 */
export class EmojiValidator {
    /**
     * Validate an EmojiItem object
     */
    static validateEmojiItem(item: any): item is EmojiItem {
        if (!item || typeof item !== 'object') {
            return false;
        }

        // Check required fields
        if (typeof item.key !== 'string' || !item.key.trim()) {
            return false;
        }

        if (typeof item.icon !== 'string' || !item.icon.trim()) {
            return false;
        }

        if (typeof item.text !== 'string' || !item.text.trim()) {
            return false;
        }

        if (!['emoticon', 'emoji', 'image'].includes(item.type)) {
            return false;
        }

        if (typeof item.category !== 'string' || !item.category.trim()) {
            return false;
        }

        // For image type, URL should be provided
        if (item.type === 'image') {
            if (typeof item.url !== 'string' || !item.url.trim()) {
                return false;
            }
            
            // Basic URL validation
            if (!this.isValidUrl(item.url)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Validate an EmojiCollection object
     */
    static validateEmojiCollection(collection: any): collection is EmojiCollection {
        if (!collection || typeof collection !== 'object') {
            return false;
        }

        // Check required fields
        if (typeof collection.name !== 'string' || !collection.name.trim()) {
            return false;
        }

        if (!['emoticon', 'emoji', 'image'].includes(collection.type)) {
            return false;
        }

        if (!Array.isArray(collection.items)) {
            return false;
        }

        if (typeof collection.source !== 'string' || !collection.source.trim()) {
            return false;
        }

        // Validate all items in the collection
        for (const item of collection.items) {
            if (!this.validateEmojiItem(item)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Validate emoji key uniqueness within a collection
     */
    static validateUniqueKeys(items: EmojiItem[]): boolean {
        const keys = new Set<string>();
        
        for (const item of items) {
            if (keys.has(item.key)) {
                return false; // Duplicate key found
            }
            keys.add(item.key);
        }
        
        return true;
    }

    /**
     * Basic URL validation
     */
    private static isValidUrl(url: string): boolean {
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch {
            return false;
        }
    }

    /**
     * Sanitize emoji item by removing potentially harmful content
     */
    static sanitizeEmojiItem(item: EmojiItem): EmojiItem {
        return {
            key: item.key.trim(),
            icon: item.icon.trim(),
            text: item.text.trim(),
            type: item.type,
            category: item.category.trim(),
            url: item.url?.trim()
        };
    }

    /**
     * Sanitize emoji collection
     */
    static sanitizeEmojiCollection(collection: EmojiCollection): EmojiCollection {
        return {
            name: collection.name.trim(),
            type: collection.type,
            items: collection.items.map(item => this.sanitizeEmojiItem(item)),
            source: collection.source.trim()
        };
    }
}