import { EmojiItem, EmojiCollection, EmojiSelectorSettings } from './types';
import { EmojiStorage } from './emoji-storage';
import { OwoFileParser } from './owo-parser';
import { EmojiCacheManager } from './emoji-cache';

/**
 * Manages emoji collections and provides search functionality
 */
export class EmojiManager {
    private storage: EmojiStorage;
    private settings: EmojiSelectorSettings;
    private isLoading: boolean = false;
    private lastLoadTime: number = 0;
    private loadCacheTimeout: number = 5 * 60 * 1000; // 5 minutes cache
    private cacheManager: EmojiCacheManager;
    private cacheInitialized: boolean = false;
    private cacheInitPromise: Promise<void> | null = null;

    constructor(settings: EmojiSelectorSettings, saveData: (data: any) => Promise<void>, loadData: () => Promise<any>) {
        this.storage = new EmojiStorage();
        this.settings = settings;
        this.cacheManager = new EmojiCacheManager(saveData, loadData);

        // Set the cache manager in the parser
        OwoFileParser.setCacheManager(this.cacheManager);

        // Initialize cache asynchronously (non-blocking)
        this.initializeCache();

        // Start background cache warming for configured URLs
        this.startBackgroundCacheWarming();
    }

    /**
     * Initialize the cache manager (non-blocking)
     */
    private initializeCache(): void {
        if (this.cacheInitialized || this.cacheInitPromise) {
            return;
        }

        this.cacheInitPromise = (async () => {
            try {
                await this.cacheManager.initialize();
                this.cacheInitialized = true;
                console.log('Emoji cache initialization completed');
            } catch (error) {
                console.error('Failed to initialize emoji cache:', error);
                this.cacheInitialized = true; // Mark as initialized even on error for graceful degradation
            }
        })();

        // Don't await - let it run in background
        this.cacheInitPromise.catch(error => {
            console.error('Cache initialization promise failed:', error);
        });
    }

    /**
     * Ensure cache is initialized before using it
     */
    private async ensureCacheInitialized(): Promise<void> {
        if (!this.cacheInitialized && this.cacheInitPromise) {
            await this.cacheInitPromise;
        }
    }

    /**
     * Update settings and clean up cache if URLs changed
     */
    updateSettings(settings: EmojiSelectorSettings): void {
        const oldUrls = this.settings.owoJsonUrls;
        this.settings = settings;

        // Clean up cache if URLs changed
        if (oldUrls !== settings.owoJsonUrls) {
            this.cleanupCache().catch(error => {
                console.error('Failed to cleanup emoji cache:', error);
            });

            // Start background warming for new URLs
            this.startBackgroundCacheWarming();
        }
    }

    /**
     * Load emoji collections from configured URLs
     * This method is called when the emoji picker is opened
     */
    async loadEmojiCollections(): Promise<void> {
        // Prevent concurrent loading
        if (this.isLoading) {
            return;
        }

        // Try to ensure cache is initialized, but don't block if it fails
        try {
            await this.ensureCacheInitialized();
        } catch (error) {
            console.warn('Cache initialization failed, proceeding without cache:', error);
        }

        // Check if we have recent data (simple caching)
        const now = Date.now();
        if (this.storage.getTotalEmojiCount() > 0 && (now - this.lastLoadTime) < this.loadCacheTimeout) {
            return; // Use cached data
        }

        this.isLoading = true;

        try {
            // Clear existing collections
            this.storage.clear();

            // Parse URLs from settings
            const urls = this.parseUrls(this.settings.owoJsonUrls);

            if (urls.length === 0) {
                console.warn('No emoji URLs configured');
                return;
            }

            // Load collections from URLs with proper error handling
            const collections = await OwoFileParser.loadFromUrls(urls);

            // Add collections to storage
            for (const collection of collections) {
                this.storage.addCollection(collection);
            }

            this.lastLoadTime = now;
            console.log(`Loaded ${collections.length} emoji collections with ${this.storage.getTotalEmojiCount()} total emojis`);

        } catch (error) {
            console.error('Failed to load emoji collections:', error);
            // Don't throw error - allow graceful degradation
            // The UI can show an error message or empty state
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Search emojis by query
     */
    searchEmojis(query: string): EmojiItem[] {
        return this.storage.searchEmojis(query);
    }

    /**
     * Get all emojis
     */
    getAllEmojis(): EmojiItem[] {
        return this.storage.getAllEmojis();
    }

    /**
     * Get emoji by key
     */
    getEmojiByKey(key: string): EmojiItem | undefined {
        return this.storage.getEmojiByKey(key);
    }

    /**
     * Get all collections
     */
    getAllCollections(): EmojiCollection[] {
        return this.storage.getAllCollections();
    }

    /**
     * Get total emoji count
     */
    getTotalEmojiCount(): number {
        return this.storage.getTotalEmojiCount();
    }

    /**
     * Check if currently loading
     */
    isCurrentlyLoading(): boolean {
        return this.isLoading;
    }

    /**
     * Force reload of emoji collections (clears cache and fetches fresh data)
     */
    async forceReload(): Promise<void> {
        // Try to ensure cache is initialized, but don't block if it fails
        try {
            await this.ensureCacheInitialized();
        } catch (error) {
            console.warn('Cache initialization failed during force reload, proceeding without cache:', error);
        }

        // Clear the cache to force fresh fetches
        try {
            if (this.cacheManager) {
                await this.cacheManager.clearAll();
            }
        } catch (error) {
            console.warn('Failed to clear cache during force reload:', error);
        }

        this.lastLoadTime = 0;

        // Clear existing collections
        this.storage.clear();

        // Parse URLs from settings
        const urls = this.parseUrls(this.settings.owoJsonUrls);

        if (urls.length === 0) {
            console.warn('No emoji URLs configured for force reload');
            return;
        }

        try {
            // Load collections from URLs with force refresh
            const collections = await OwoFileParser.loadFromUrls(urls, true);

            // Add collections to storage
            for (const collection of collections) {
                this.storage.addCollection(collection);
            }

            this.lastLoadTime = Date.now();
            console.log(`Force reloaded ${collections.length} emoji collections with ${this.storage.getTotalEmojiCount()} total emojis`);

        } catch (error) {
            console.error('Failed to force reload emoji collections:', error);
            // Don't throw error - allow graceful degradation
        }
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): { totalUrls: number, totalSize: number, oldestCache: number | null } | null {
        return this.cacheManager ? this.cacheManager.getCacheStats() : null;
    }

    /**
     * Get cached URLs
     */
    getCachedUrls(): string[] {
        return this.cacheManager ? this.cacheManager.getCachedUrls() : [];
    }

    /**
     * Clean up cache for URLs that are no longer in the settings
     */
    async cleanupCache(): Promise<void> {
        if (!this.cacheManager) {
            return;
        }

        try {
            await this.ensureCacheInitialized();
            const activeUrls = this.parseUrls(this.settings.owoJsonUrls);
            await this.cacheManager.cleanupUnusedCache(activeUrls);
        } catch (error) {
            console.error('Failed to cleanup cache:', error);
            // Don't throw error - graceful degradation
        }
    }

    /**
     * Parse URLs from comma-separated string
     */
    parseUrls(urlString: string): string[] {
        if (!urlString || !urlString.trim()) {
            return [];
        }

        return urlString
            .split(',')
            .map(url => url.trim())
            .filter(url => url.length > 0);
    }

    /**
     * Start background cache warming for configured URLs
     */
    private startBackgroundCacheWarming(): void {
        // Use setTimeout to defer this until after constructor completes
        setTimeout(async () => {
            try {
                // Wait for cache to be initialized first
                await this.ensureCacheInitialized();

                const urls = this.parseUrls(this.settings.owoJsonUrls);
                if (urls.length > 0) {
                    console.log(`Starting background cache warming for ${urls.length} URLs`);
                    await this.cacheManager.startBackgroundWarming(urls);
                }
            } catch (error) {
                console.error('Failed to start background cache warming:', error);
            }
        }, 100); // Small delay to ensure constructor completes
    }

    /**
     * Check if cache is ready for use
     */
    isCacheReady(): boolean {
        return this.cacheManager.isReady();
    }

    /**
     * Check if background warming is in progress
     */
    isBackgroundWarmingInProgress(): boolean {
        return this.cacheManager.isBackgroundWarmingInProgress();
    }
}