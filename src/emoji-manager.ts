import { EmojiItem, EmojiCollection, EmojiSelectorSettings } from './types';
import { EmojiStorage } from './emoji-storage';
import { OwoFileParser } from './owo-parser';
import { EmojiCacheManager } from './emoji-cache';
import { RecentEmojiManager } from './recent-emoji-manager';

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
    private recentManager: RecentEmojiManager;

    constructor(settings: EmojiSelectorSettings, app: any, saveData: (data: any) => Promise<void>, loadData: () => Promise<any>) {
        this.storage = new EmojiStorage();
        this.settings = settings;
        this.cacheManager = new EmojiCacheManager(app);
        this.recentManager = new RecentEmojiManager(
            settings.maxRecentEmojis,
            saveData,
            loadData
        );

        // Set the cache manager in the parser
        OwoFileParser.setCacheManager(this.cacheManager);

        // Defer ALL heavy initialization to first use
        // This improves plugin startup time significantly
        // Cache initialization is now completely deferred
    }

    /**
     * Initialize the cache manager (completely deferred until first actual use)
     */
    private initializeCache(): void {
        if (this.cacheInitialized || this.cacheInitPromise) {
            return;
        }

        this.cacheInitPromise = (async () => {
            try {
                // This is now the first time we actually read emoji cache data
                await this.cacheManager.initialize();
                this.cacheInitialized = true;
                // Cache initialization completed (deferred)
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
     * Update settings and clear cache if URLs changed
     */
    updateSettings(settings: EmojiSelectorSettings): void {
        const oldUrls = this.settings.owoJsonUrls;
        const oldMaxRecent = this.settings.maxRecentEmojis;
        this.settings = settings;

        // Update recent manager max size if changed
        if (oldMaxRecent !== settings.maxRecentEmojis) {
            this.recentManager.updateMaxSize(settings.maxRecentEmojis).catch(error => {
                console.error('Failed to update recent emojis max size:', error);
            });
        }

        // If URLs changed, clear all cache and reload
        if (oldUrls !== settings.owoJsonUrls) {
            // Clear all cache and force reload
            this.clearCacheAndReload().catch((error: any) => {
                console.error('Failed to clear cache and reload:', error);
            });
        }
    }

    /**
     * Ensure heavy initialization is done (called only when emoji picker is opened)
     */
    private async ensureInitialized(): Promise<void> {
        if (!this.cacheInitPromise) {
            // Initialize cache asynchronously - this is when we first read emoji cache data
            this.initializeCache();

            // Start background cache warming for configured URLs
            this.startBackgroundCacheWarming();
        }
    }

    /**
     * Load emoji collections from configured URLs
     * This method is called when the emoji picker is opened
     */
    async loadEmojiCollections(): Promise<void> {
        // Ensure initialization is done
        await this.ensureInitialized();
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

            // Add collections to storage (batch operation)
            this.storage.addCollections(collections);

            this.lastLoadTime = now;
            // Collections loaded successfully

        } catch (error) {
            console.error('Failed to load emoji collections:', error);
            // Don't throw error - allow graceful degradation
            // The UI can show an error message or empty state
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Search emojis by query with optimized indexing
     */
    searchEmojis(query: string): EmojiItem[] {
        return this.storage.searchEmojis(query);
    }

    /**
     * Advanced search with regex, fuzzy matching, and collection name filtering
     * Supports patterns like "活字乱刷.*a" to search collection "活字乱刷" for emojis containing "a"
     */
    advancedSearchWithCollections(query: string): EmojiItem[] {
        return this.storage.advancedSearchWithCollections(
            query,
            this.settings.enableRegexSearch,
            this.settings.enableFuzzySearch
        );
    }

    /**
     * Advanced search with category filtering
     */
    advancedSearchEmojis(query: string, category?: string): EmojiItem[] {
        return this.storage.advancedSearch(query, category);
    }

    /**
     * Get emojis by category (optimized lookup)
     */
    getEmojisByCategory(category: string): EmojiItem[] {
        return this.storage.getEmojisByCategory(category);
    }

    /**
     * Get all available categories
     */
    getAllCategories(): string[] {
        return this.storage.getAllCategories();
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

            // Add collections to storage (batch operation)
            this.storage.addCollections(collections);

            this.lastLoadTime = Date.now();
            // Collections force reloaded successfully

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
     * Clear all cache and reload collections (used when URLs change)
     */
    async clearCacheAndReload(): Promise<void> {
        try {
            // Ensure cache is initialized
            await this.ensureCacheInitialized();

            // Clear all cache
            if (this.cacheManager) {
                await this.cacheManager.clearAll();
            }

            // Clear memory storage
            this.storage.clear();

            // Reset load time to force reload
            this.lastLoadTime = 0;

            // Start background warming for new URLs
            this.startBackgroundCacheWarming();

        } catch (error) {
            console.error('Failed to clear cache and reload:', error);
            // Don't throw error - allow graceful degradation
        }
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
                    // Starting background cache warming
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

    /**
     * Get memory usage statistics
     */
    getMemoryStats(): {
        storage: {
            totalEmojis: number;
            totalCollections: number;
            indexSizes: {
                keyIndex: number;
                textIndex: number;
                categoryIndex: number;
            };
        };
        cache: { totalUrls: number, totalSize: number, oldestCache: number | null } | null;
    } {
        return {
            storage: this.storage.getMemoryStats(),
            cache: this.getCacheStats()
        };
    }

    /**
     * Run performance benchmark comparing indexed vs natural search
     */
    runSearchPerformanceBenchmark(): void {
        this.storage.runPerformanceBenchmark();
    }

    /**
     * Compare search performance with custom queries
     */
    compareSearchPerformance(testQueries: string[]) {
        return this.storage.compareSearchPerformance(testQueries);
    }

    /**
     * Search using natural (non-indexed) method for comparison
     */
    searchEmojisNatural(query: string): EmojiItem[] {
        return this.storage.searchEmojisNatural(query);
    }

    /**
     * Load single collection by URL
     */
    async loadSingleCollection(url: string): Promise<EmojiCollection[]> {
        try {
            await this.ensureCacheInitialized();
        } catch (error) {
            console.warn('Cache initialization failed:', error);
        }

        return await OwoFileParser.loadFromUrl(url);
    }

    /**
     * Get URLs from settings
     */
    getConfiguredUrls(): string[] {
        return this.parseUrls(this.settings.owoJsonUrls);
    }

    /**
     * Add emoji to recent list
     */
    async addToRecent(emoji: EmojiItem): Promise<void> {
        if (this.settings.enableRecentEmojis) {
            await this.recentManager.addEmoji(emoji);
        }
    }

    /**
     * Get recent emojis
     */
    async getRecentEmojis(): Promise<EmojiItem[]> {
        if (!this.settings.enableRecentEmojis) {
            return [];
        }
        return await this.recentManager.getRecentEmojis();
    }

    /**
     * Clear recent emojis
     */
    async clearRecentEmojis(): Promise<void> {
        await this.recentManager.clear();
    }

    /**
     * Get recent emojis count
     */
    async getRecentEmojisCount(): Promise<number> {
        if (!this.settings.enableRecentEmojis) {
            return 0;
        }
        return await this.recentManager.getCount();
    }

    /**
     * Get recent emojis statistics
     */
    async getRecentEmojisStats(): Promise<{
        totalCount: number;
        totalUsage: number;
        mostUsed: any;
        oldestEntry: any;
    }> {
        return await this.recentManager.getStats();
    }
}