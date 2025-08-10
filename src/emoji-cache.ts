import { App } from 'obsidian';
import { EmojiJsonCache } from './types';
import { logger } from './logger';

/**
 * Manages persistent caching of emoji JSON files using separate cache file
 */
export class EmojiCacheManager {
    private cache: EmojiJsonCache = {};
    private app: App;
    private cacheFilePath: string;
    private initializationPromise: Promise<void> | null = null;
    private isInitialized: boolean = false;
    private backgroundWarmingPromise: Promise<void> | null = null;
    private saveQueue: Promise<void> = Promise.resolve();

    constructor(app: App) {
        this.app = app;
        this.cacheFilePath = `${app.vault.configDir}/plugins/emoji-selector/cache.json`;
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
            // Try to read from separate cache file first
            const cacheExists = await this.app.vault.adapter.exists(this.cacheFilePath);
            if (cacheExists) {
                const cacheContent = await this.app.vault.adapter.read(this.cacheFilePath);
                this.cache = JSON.parse(cacheContent);
                // Cache initialized from separate file
            } else {
                // Migration: check if cache exists in old data.json format
                await this.migrateCacheFromDataJson();
            }
            this.isInitialized = true;
        } catch (error) {
            logger.warn('Failed to load emoji cache, starting with empty cache:', error);
            this.cache = {};
            this.isInitialized = true;
            // Don't throw error - graceful degradation
        }
    }

    /**
     * Migrate cache from old data.json format to separate cache file
     */
    private async migrateCacheFromDataJson(): Promise<void> {
        try {
            // This is a one-time migration for existing users
            const dataPath = `${this.app.vault.configDir}/plugins/emoji-selector/data.json`;
            const dataExists = await this.app.vault.adapter.exists(dataPath);
            if (dataExists) {
                const dataContent = await this.app.vault.adapter.read(dataPath);
                const data = JSON.parse(dataContent);
                if (data && data.emojiJsonCache && typeof data.emojiJsonCache === 'object') {
                    this.cache = data.emojiJsonCache;
                    // Save to new cache file
                    await this.saveCacheToFile();
                    // Remove cache from data.json to keep it small
                    delete data.emojiJsonCache;
                    await this.app.vault.adapter.write(dataPath, JSON.stringify(data, null, 2));
                    logger.info('Migrated emoji cache to separate file');
                }
            }
        } catch (error) {
            logger.warn('Failed to migrate cache from data.json:', error);
            this.cache = {};
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
     * Save cache to separate file with queuing to prevent concurrent saves
     */
    async saveCache(): Promise<void> {
        // Queue save operations to prevent concurrent writes
        this.saveQueue = this.saveQueue.then(() => this.saveCacheToFile());
        return this.saveQueue;
    }

    /**
     * Save cache to separate file
     */
    private async saveCacheToFile(): Promise<void> {
        try {
            // Ensure the plugin directory exists
            const pluginDir = `${this.app.vault.configDir}/plugins/emoji-selector`;
            const dirExists = await this.app.vault.adapter.exists(pluginDir);
            if (!dirExists) {
                await this.app.vault.adapter.mkdir(pluginDir);
            }

            // Save cache to separate file
            const cacheContent = JSON.stringify(this.cache, null, 2);
            await this.app.vault.adapter.write(this.cacheFilePath, cacheContent);
        } catch (error) {
            logger.error('Failed to save emoji cache to separate file:', error);
            // Don't throw error - graceful degradation
        }
    }

    /**
     * Get cached data for a URL if it exists and is valid
     */
    getCachedData(url: string): unknown | null {
        if (!this.isInitialized) {
            logger.debug('Cache not initialized yet, returning null for URL:', url);
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
    async setCachedData(url: string, data: unknown, etag?: string): Promise<void> {
        if (!this.isInitialized) {
            logger.debug('Cache not initialized yet, skipping cache set for URL:', url);
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
                logger.error('Background cache save failed for URL:', url, error);
            });
        } catch (error) {
            logger.error('Failed to set cached data for URL:', url, error);
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
            logger.debug('Cache not initialized yet, skipping clear for URL:', url);
            return;
        }

        try {
            delete this.cache[url];
            // Save to persistent storage in background (non-blocking)
            this.saveCache().catch(error => {
                logger.error('Background cache save failed after clearing URL:', url, error);
            });
        } catch (error) {
            logger.error('Failed to clear cached data for URL:', url, error);
        }
    }

    /**
     * Clear all cache with background saving
     */
    async clearAll(): Promise<void> {
        if (!this.isInitialized) {
            logger.debug('Cache not initialized yet, skipping clear all');
            return;
        }

        try {
            this.cache = {};
            // Save to persistent storage in background (non-blocking)
            this.saveCache().catch(error => {
                logger.error('Background cache save failed after clearing all cache:', error);
            });
        } catch (error) {
            logger.error('Failed to clear all cached data:', error);
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
            logger.debug('Cache not initialized yet, skipping cleanup');
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
                    logger.error('Background cache save failed after cleanup:', error);
                });
            }
        } catch (error) {
            logger.error('Failed to cleanup unused cache entries:', error);
        }
    }

    /**
     * Start background cache warming for provided URLs
     */
    async startBackgroundWarming(urls: string[]): Promise<void> {
        if (!this.isInitialized) {
            logger.debug('Cache not initialized yet, skipping background warming');
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
                logger.error('Background cache warming failed:', error);
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
                        logger.warn(`Background warming failed for URL: ${url}`, error);
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
            logger.error('Background cache warming encountered an error:', error);
        }
    }

    /**
     * Check if background warming is in progress
     */
    isBackgroundWarmingInProgress(): boolean {
        return this.backgroundWarmingPromise !== null;
    }
}