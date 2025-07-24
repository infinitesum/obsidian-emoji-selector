import { EmojiJsonCache } from './types';

/**
 * Manages persistent caching of emoji JSON files
 */
export class EmojiCacheManager {
    private cache: EmojiJsonCache = {};
    private saveData: (data: any) => Promise<void>;
    private loadData: () => Promise<any>;
    private initializationPromise: Promise<void> | null = null;
    private isInitialized: boolean = false;
    private backgroundWarmingPromise: Promise<void> | null = null;
    private saveQueue: Promise<void> = Promise.resolve();

    constructor(saveData: (data: any) => Promise<void>, loadData: () => Promise<any>) {
        this.saveData = saveData;
        this.loadData = loadData;
    }

    /**
     * Initialize cache from stored data (non-blocking)
     */
    async initialize(): Promise<void> {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this.performInitialization();
        return this.initializationPromise;
    }

    /**
     * Perform the actual cache initialization with proper error handling
     */
    private async performInitialization(): Promise<void> {
        try {
            const data = await this.loadData();
            if (data && data.emojiJsonCache && typeof data.emojiJsonCache === 'object') {
                this.cache = data.emojiJsonCache;
                // Cache initialized with existing data
            } else {
                this.cache = {};
                // Cache initialized as empty
            }
            this.isInitialized = true;
        } catch (error) {
            console.warn('Failed to load emoji cache, starting with empty cache:', error);
            this.cache = {};
            this.isInitialized = true;
            // Don't throw error - graceful degradation
        }
    }

    /**
     * Check if cache is initialized
     */
    isReady(): boolean {
        return this.isInitialized;
    }

    /**
     * Wait for cache to be initialized
     */
    async waitForInitialization(): Promise<void> {
        if (this.initializationPromise) {
            await this.initializationPromise;
        }
    }

    /**
     * Save cache to persistent storage with queuing to prevent concurrent saves
     */
    async saveCache(): Promise<void> {
        // Queue save operations to prevent concurrent writes
        this.saveQueue = this.saveQueue.then(() => this.performSave());
        return this.saveQueue;
    }

    /**
     * Perform the actual cache save with proper error handling
     */
    private async performSave(): Promise<void> {
        try {
            const data = await this.loadData();
            const updatedData = {
                ...data,
                emojiJsonCache: this.cache
            };
            await this.saveData(updatedData);
        } catch (error) {
            console.error('Failed to save emoji cache:', error);
            // Don't throw error - graceful degradation
        }
    }

    /**
     * Get cached data for a URL if it exists and is valid
     */
    getCachedData(url: string): any | null {
        if (!this.isInitialized) {
            console.warn('Cache not initialized yet, returning null for URL:', url);
            return null;
        }

        const cached = this.cache[url];
        if (!cached) {
            return null;
        }

        // For now, we'll use cached data indefinitely until user updates
        // In the future, we could add expiration logic here
        return cached.data;
    }

    /**
     * Cache data for a URL with background saving
     */
    async setCachedData(url: string, data: any, etag?: string): Promise<void> {
        if (!this.isInitialized) {
            console.warn('Cache not initialized yet, skipping cache set for URL:', url);
            return;
        }

        try {
            this.cache[url] = {
                url,
                data,
                cachedAt: Date.now(),
                etag
            };

            // Save to persistent storage in background (non-blocking)
            this.saveCache().catch(error => {
                console.error('Background cache save failed for URL:', url, error);
            });
        } catch (error) {
            console.error('Failed to set cached data for URL:', url, error);
        }
    }

    /**
     * Check if URL is cached
     */
    isCached(url: string): boolean {
        if (!this.isInitialized) {
            return false;
        }
        return url in this.cache;
    }

    /**
     * Clear cache for specific URL with background saving
     */
    async clearUrl(url: string): Promise<void> {
        if (!this.isInitialized) {
            console.warn('Cache not initialized yet, skipping clear for URL:', url);
            return;
        }

        try {
            delete this.cache[url];
            // Save to persistent storage in background (non-blocking)
            this.saveCache().catch(error => {
                console.error('Background cache save failed after clearing URL:', url, error);
            });
        } catch (error) {
            console.error('Failed to clear cached data for URL:', url, error);
        }
    }

    /**
     * Clear all cache with background saving
     */
    async clearAll(): Promise<void> {
        if (!this.isInitialized) {
            console.warn('Cache not initialized yet, skipping clear all');
            return;
        }

        try {
            this.cache = {};
            // Save to persistent storage in background (non-blocking)
            this.saveCache().catch(error => {
                console.error('Background cache save failed after clearing all cache:', error);
            });
        } catch (error) {
            console.error('Failed to clear all cached data:', error);
        }
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
        if (!this.isInitialized) {
            console.warn('Cache not initialized yet, skipping cleanup');
            return;
        }

        try {
            const cachedUrls = Object.keys(this.cache);
            const urlsToRemove = cachedUrls.filter(url => !activeUrls.includes(url));

            if (urlsToRemove.length > 0) {
                // Cleaning up unused cache entries
                for (const url of urlsToRemove) {
                    delete this.cache[url];
                }

                // Save to persistent storage in background (non-blocking)
                this.saveCache().catch(error => {
                    console.error('Background cache save failed after cleanup:', error);
                });
            }
        } catch (error) {
            console.error('Failed to cleanup unused cache entries:', error);
        }
    }

    /**
     * Start background cache warming for provided URLs
     */
    async startBackgroundWarming(urls: string[]): Promise<void> {
        if (!this.isInitialized) {
            console.warn('Cache not initialized yet, skipping background warming');
            return;
        }

        if (this.backgroundWarmingPromise) {
            // Background cache warming already in progress
            return;
        }

        this.backgroundWarmingPromise = this.performBackgroundWarming(urls);

        // Don't await - let it run in background
        this.backgroundWarmingPromise
            .catch(error => {
                console.error('Background cache warming failed:', error);
            })
            .finally(() => {
                this.backgroundWarmingPromise = null;
            });
    }

    /**
     * Perform background cache warming
     */
    private async performBackgroundWarming(urls: string[]): Promise<void> {
        // Starting background cache warming

        const uncachedUrls = urls.filter(url => !this.isCached(url));

        if (uncachedUrls.length === 0) {
            // All URLs already cached
            return;
        }

        // Background warming uncached URLs

        // Import OwoFileParser dynamically to avoid circular dependencies
        const { OwoFileParser } = await import('./owo-parser');

        try {
            // Load URLs in parallel but with limited concurrency to avoid overwhelming the system
            const batchSize = 3; // Process 3 URLs at a time
            for (let i = 0; i < uncachedUrls.length; i += batchSize) {
                const batch = uncachedUrls.slice(i, i + batchSize);
                const batchPromises = batch.map(async (url) => {
                    try {
                        await OwoFileParser.loadFromUrl(url);
                        // Cache warmed for URL
                    } catch (error) {
                        console.warn(`Background warming failed for URL: ${url}`, error);
                    }
                });

                await Promise.allSettled(batchPromises);

                // Small delay between batches to avoid overwhelming the system
                if (i + batchSize < uncachedUrls.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            // Background cache warming completed
        } catch (error) {
            console.error('Background cache warming encountered an error:', error);
        }
    }

    /**
     * Check if background warming is in progress
     */
    isBackgroundWarmingInProgress(): boolean {
        return this.backgroundWarmingPromise !== null;
    }
}