import { EmojiItem, RecentEmojiEntry, RecentEmojisData } from './types';
import { OwoFileParser } from './owo-parser';

/**
 * High-performance recent emoji manager using LRU algorithm
 * Provides O(1) operations for adding and retrieving recent emojis
 */
export class RecentEmojiManager {
    private entries: Map<string, RecentEmojiEntry> = new Map();
    private order: string[] = [];
    private maxSize: number;
    private saveData: (data: unknown) => Promise<void>;
    private loadData: () => Promise<unknown>;
    private isInitialized: boolean = false;
    private saveQueue: Promise<void> = Promise.resolve();

    constructor(
        maxSize: number,
        saveData: (data: unknown) => Promise<void>,
        loadData: () => Promise<unknown>
    ) {
        this.maxSize = maxSize;
        this.saveData = saveData;
        this.loadData = loadData;
    }

    /**
     * Initialize recent emojis from stored data
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            const data = await this.loadData();
            const recentData: RecentEmojisData = (data as Record<string, unknown>)?.recentEmojis as RecentEmojisData;

            if (recentData?.entries && recentData?.order) {
                // Restore entries
                for (const [key, entry] of Object.entries(recentData.entries)) {
                    this.entries.set(key, entry);
                }

                // Restore order (validate that all keys exist)
                this.order = recentData.order.filter(key => this.entries.has(key));

                // Clean up any orphaned entries
                for (const key of this.entries.keys()) {
                    if (!this.order.includes(key)) {
                        this.entries.delete(key);
                    }
                }
            }

            this.isInitialized = true;
        } catch (error) {
            console.warn('Failed to load recent emojis:', error);
            this.isInitialized = true;
        }
    }

    /**
     * Add or update an emoji in recent list (O(1) operation)
     */
    async addEmoji(emoji: EmojiItem): Promise<void> {
        await this.initialize();

        const now = Date.now();
        const existing = this.entries.get(emoji.key);

        if (existing) {
            // Update existing entry
            existing.lastUsed = now;
            existing.count++;

            // Move to front of order (O(1) amortized)
            this.moveToFront(emoji.key);
        } else {
            // Normalize emoji before storing
            const normalizedEmoji = this.normalizeEmojiForStorage(emoji);
            
            // Add new entry
            const entry: RecentEmojiEntry = {
                emoji: normalizedEmoji,
                lastUsed: now,
                count: 1
            };

            this.entries.set(emoji.key, entry);
            this.order.unshift(emoji.key);

            // Enforce size limit (LRU eviction)
            if (this.order.length > this.maxSize) {
                const removedKey = this.order.pop()!;
                this.entries.delete(removedKey);
            }
        }

        // Persist changes
        await this.persist();
    }

    /**
     * Get recent emojis in order of recency (O(1) operation)
     */
    async getRecentEmojis(): Promise<EmojiItem[]> {
        await this.initialize();

        const result: EmojiItem[] = [];
        for (const key of this.order) {
            const entry = this.entries.get(key);
            if (entry) {
                // Restore emoji from storage (regenerate resource paths if needed)
                result.push(this.restoreEmojiFromStorage(entry.emoji));
            }
        }
        return result;
    }

    /**
     * Get recent emoji entries with metadata
     */
    async getRecentEntries(): Promise<RecentEmojiEntry[]> {
        await this.initialize();

        const result: RecentEmojiEntry[] = [];
        for (const key of this.order) {
            const entry = this.entries.get(key);
            if (entry) {
                // Restore emoji from storage
                result.push({
                    ...entry,
                    emoji: this.restoreEmojiFromStorage(entry.emoji)
                });
            }
        }
        return result;
    }

    /**
     * Check if an emoji is in recent list (O(1) operation)
     */
    async hasEmoji(emojiKey: string): Promise<boolean> {
        await this.initialize();
        return this.entries.has(emojiKey);
    }

    /**
     * Clear all recent emojis
     */
    async clear(): Promise<void> {
        this.entries.clear();
        this.order = [];
        await this.persist();
    }

    /**
     * Get count of recent emojis
     */
    async getCount(): Promise<number> {
        await this.initialize();
        return this.order.length;
    }

    /**
     * Update max size and trim if necessary
     */
    async updateMaxSize(newMaxSize: number): Promise<void> {
        await this.initialize();

        this.maxSize = newMaxSize;

        // Trim if current size exceeds new max
        while (this.order.length > this.maxSize) {
            const removedKey = this.order.pop()!;
            this.entries.delete(removedKey);
        }

        await this.persist();
    }

    /**
     * Get statistics about recent emojis
     */
    async getStats(): Promise<{
        totalCount: number;
        totalUsage: number;
        mostUsed: RecentEmojiEntry | null;
        oldestEntry: RecentEmojiEntry | null;
    }> {
        await this.initialize();

        let totalUsage = 0;
        let mostUsed: RecentEmojiEntry | null = null;
        let oldestEntry: RecentEmojiEntry | null = null;

        for (const entry of this.entries.values()) {
            totalUsage += entry.count;

            if (!mostUsed || entry.count > mostUsed.count) {
                mostUsed = entry;
            }

            if (!oldestEntry || entry.lastUsed < oldestEntry.lastUsed) {
                oldestEntry = entry;
            }
        }

        return {
            totalCount: this.order.length,
            totalUsage,
            mostUsed,
            oldestEntry
        };
    }

    /**
     * Normalize emoji for storage by clearing temporary blob URLs
     * Only handles local vault images; remote URLs (http/https) are kept as-is
     */
    private normalizeEmojiForStorage(emoji: EmojiItem): EmojiItem {
        // Only process local image files (not remote http/https URLs)
        if (emoji.type === 'image' && emoji.originalPath && 
            !emoji.originalPath.startsWith('http://') && 
            !emoji.originalPath.startsWith('https://')) {
            // Clear the temporary blob URL for local files, keep only originalPath
            return {
                ...emoji,
                url: undefined // Clear temporary URL
            };
        }
        // Remote URLs and other types can be stored as-is
        return emoji;
    }

    /**
     * Restore emoji from storage by regenerating temporary blob URLs
     * Only handles local vault images; remote URLs are already persistent
     */
    private restoreEmojiFromStorage(emoji: EmojiItem): EmojiItem {
        // Only regenerate URL for local image files without a valid URL
        if (emoji.type === 'image' && emoji.originalPath && !emoji.url &&
            !emoji.originalPath.startsWith('http://') && 
            !emoji.originalPath.startsWith('https://')) {
            // Regenerate the temporary blob URL from originalPath for local files
            const regeneratedUrl = OwoFileParser.convertToResourcePath(emoji.originalPath);
            
            return {
                ...emoji,
                url: regeneratedUrl
            };
        }
        // Remote URLs are already valid, return as-is
        return emoji;
    }

    /**
     * Move emoji key to front of order list (O(1) amortized)
     */
    private moveToFront(key: string): void {
        const index = this.order.indexOf(key);
        if (index > 0) {
            // Remove from current position and add to front
            this.order.splice(index, 1);
            this.order.unshift(key);
        }
        // If index is 0, it's already at front
        // If index is -1, it's not in the list (shouldn't happen)
    }

    /**
     * Persist recent emojis data with queuing to prevent concurrent saves
     */
    private async persist(): Promise<void> {
        // Queue save operations to prevent concurrent writes
        this.saveQueue = (async () => {
            await this.saveQueue;
            return this.performSave();
        })();
        return this.saveQueue;
    }

    /**
     * Perform the actual save with proper error handling
     */
    private async performSave(): Promise<void> {
        try {
            const existingData = await this.loadData();

            // Convert Map to plain object more explicitly
            const entriesObj: Record<string, RecentEmojiEntry> = {};
            for (const [key, value] of this.entries) {
                entriesObj[key] = {
                    emoji: value.emoji,
                    lastUsed: value.lastUsed,
                    count: value.count
                };
            }

            const recentData: RecentEmojisData = {
                entries: entriesObj,
                order: [...this.order]
            };

            const updatedData = {
                ...(existingData as Record<string, unknown>),
                recentEmojis: recentData
            };

            await this.saveData(updatedData);
        } catch (error) {
            console.error('Failed to persist recent emojis:', error);
        }
    }
}