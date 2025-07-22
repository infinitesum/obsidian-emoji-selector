import { EmojiJsonCache } from './types';

/**
 * Manages persistent caching of emoji JSON files
 */
export class EmojiCacheManager {
    private cache: EmojiJsonCache = {};
    private saveData: (data: any) => Promise<void>;
    private loadData: () => Promise<any>;

    constructor(saveData: (data: any) => Promise<void>, loadData: () => Promise<any>) {
        this.saveData = saveData;
        this.loadData = loadData;
    }

    /**
     * Initialize cache from stored data
     */
    async initialize(): Promise<void> {
        try {
            const data = await this.loadData();
            if (data && data.emojiJsonCache) {
                this.cache = data.emojiJsonCache;
            } else {
                this.cache = {};
            }
        } catch (error) {
            console.warn('Failed to load emoji cache:', error);
            this.cache = {};
        }
    }

    /**
     * Save cache to persistent storage
     */
    async saveCache(): Promise<void> {
        try {
            const data = await this.loadData();
            const updatedData = {
                ...data,
                emojiJsonCache: this.cache
            };
            await this.saveData(updatedData);
        } catch (error) {
            console.error('Failed to save emoji cache:', error);
        }
    }

    /**
     * Get cached data for a URL if it exists and is valid
     */
    getCachedData(url: string): any | null {
        const cached = this.cache[url];
        if (!cached) {
            return null;
        }

        // For now, we'll use cached data indefinitely until user updates
        // In the future, we could add expiration logic here
        return cached.data;
    }

    /**
     * Cache data for a URL
     */
    async setCachedData(url: string, data: any, etag?: string): Promise<void> {
        this.cache[url] = {
            url,
            data,
            cachedAt: Date.now(),
            etag
        };

        // Save to persistent storage
        await this.saveCache();
    }

    /**
     * Check if URL is cached
     */
    isCached(url: string): boolean {
        return url in this.cache;
    }

    /**
     * Clear cache for specific URL
     */
    async clearUrl(url: string): Promise<void> {
        delete this.cache[url];
        await this.saveCache();
    }

    /**
     * Clear all cache
     */
    async clearAll(): Promise<void> {
        this.cache = {};
        await this.saveCache();
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): { totalUrls: number, totalSize: number, oldestCache: number | null } {
        const urls = Object.keys(this.cache);
        const totalUrls = urls.length;

        let totalSize = 0;
        let oldestCache: number | null = null;

        for (const cached of Object.values(this.cache)) {
            totalSize += JSON.stringify(cached.data).length;
            if (oldestCache === null || cached.cachedAt < oldestCache) {
                oldestCache = cached.cachedAt;
            }
        }

        return { totalUrls, totalSize, oldestCache };
    }

    /**
     * Get all cached URLs
     */
    getCachedUrls(): string[] {
        return Object.keys(this.cache);
    }

    /**
     * Clean up cache entries that are no longer in the active URL list
     */
    async cleanupUnusedCache(activeUrls: string[]): Promise<void> {
        const cachedUrls = Object.keys(this.cache);
        const urlsToRemove = cachedUrls.filter(url => !activeUrls.includes(url));

        if (urlsToRemove.length > 0) {
            for (const url of urlsToRemove) {
                delete this.cache[url];
            }

            await this.saveCache();
        }
    }
}