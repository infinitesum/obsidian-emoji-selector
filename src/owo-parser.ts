import { requestUrl, App } from 'obsidian';
import { EmojiItem, EmojiCollection } from './types';
import { EmojiValidator } from './emoji-storage';
import { EmojiCacheManager } from './emoji-cache';

/**
 * Structure of an OWO.json file
 */
interface OwoFileStructure {
    [categoryName: string]: {
        type: 'emoticon' | 'emoji' | 'image';
        container: Array<{
            icon: string;
            text: string;
        }>;
    };
}

/**
 * Parser for OWO.json files
 */
export class OwoFileParser {
    private static cacheManager: EmojiCacheManager | null = null;
    private static app: App | null = null;

    /**
     * Set the cache manager instance
     */
    static setCacheManager(cacheManager: EmojiCacheManager): void {
        this.cacheManager = cacheManager;
    }

    /**
     * Set the app instance for vault access
     */
    static setApp(app: App): void {
        this.app = app;
    }

    /**
     * Load and parse OWO.json files from URLs with caching
     */
    static async loadFromUrls(urls: string[], forceRefresh: boolean = false): Promise<EmojiCollection[]> {
        const allCollections: EmojiCollection[] = [];

        for (const url of urls) {
            try {
                const collections = await this.loadFromUrl(url.trim(), forceRefresh);
                allCollections.push(...collections);
            } catch (error) {
                console.error(`Failed to load OWO file from URL ${url}:`, error);
                // Continue loading other URLs even if one fails
            }
        }

        return this.mergeCollections(allCollections);
    }

    /**
     * Load and parse a single OWO.json file from URL or local path with caching
     */
    static async loadFromUrl(url: string, forceRefresh: boolean = false): Promise<EmojiCollection[]> {
        if (!url || !url.trim()) {
            return [];
        }

        // Check if it's a URL or local file path
        const isUrl = url.startsWith('http://') || url.startsWith('https://');

        if (!isUrl) {
            // Load from local file in vault
            return this.loadFromLocalFile(url, forceRefresh);
        }

        // Validate URL format
        try {
            new URL(url);
        } catch (error) {
            throw new Error(`Invalid URL format: ${url}`);
        }

        // Check cache first (unless force refresh)
        if (!forceRefresh && this.cacheManager) {
            const cachedData = this.cacheManager.getCachedData(url);
            if (cachedData) {
                return this.parseOwoData(cachedData, url);
            }
        }

        try {
            const response = await requestUrl({ url });

            // requestUrl throws on 400+ status by default, so we don't need to check response.ok
            const jsonData = JSON.parse(response.text);

            // Cache the parsed JSON data
            if (this.cacheManager) {
                const etag = response.headers['etag'] || response.headers['ETag'] || undefined;
                await this.cacheManager.setCachedData(url, jsonData, etag);
            }

            return this.parseOwoData(jsonData, url);
        } catch (error) {
            if (error instanceof TypeError) {
                throw new Error(`Network error loading ${url}: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Load and parse a local file from vault
     */
    private static async loadFromLocalFile(filePath: string, forceRefresh: boolean = false): Promise<EmojiCollection[]> {
        if (!this.app) {
            throw new Error('App instance not set. Cannot load local files.');
        }

        // Check cache first (unless force refresh)
        if (!forceRefresh && this.cacheManager) {
            const cachedData = this.cacheManager.getCachedData(filePath);
            if (cachedData) {
                return this.parseOwoData(cachedData, filePath);
            }
        }

        try {
            const content = await this.app.vault.adapter.read(filePath);
            const jsonData = JSON.parse(content);

            // Cache the data
            if (this.cacheManager) {
                await this.cacheManager.setCachedData(filePath, jsonData);
            }

            return this.parseOwoData(jsonData, filePath);
        } catch (error) {
            throw new Error(`Failed to load local file ${filePath}: ${error.message}`);
        }
    }

    /**
     * Parse an OWO.json file from file content
     */
    static parseOwoContent(content: string, filePath: string): EmojiCollection[] {
        try {
            const data = JSON.parse(content);
            return this.parseOwoData(data, filePath);
        } catch (error) {
            console.error(`Failed to parse OWO file ${filePath}:`, error);
            throw new Error(`Invalid JSON in file ${filePath}: ${error.message}`);
        }
    }

    /**
     * Parse OWO data structure into emoji collections
     */
    static parseOwoData(data: unknown, filePath: string): EmojiCollection[] {
        if (!this.validateOwoStructure(data)) {
            throw new Error(`Invalid OWO file structure in ${filePath}`);
        }

        const collections: EmojiCollection[] = [];

        for (const [categoryName, categoryData] of Object.entries(data as OwoFileStructure)) {
            try {
                const collection = this.parseCategory(categoryName, categoryData, filePath);
                if (collection.items.length > 0) {
                    collections.push(collection);
                }
            } catch (error) {
                console.warn(`Skipping category ${categoryName} in ${filePath}:`, error.message);
            }
        }

        return collections;
    }

    /**
     * Parse a single category into an emoji collection
     */
    private static parseCategory(
        categoryName: string,
        categoryData: OwoFileStructure[string],
        filePath: string
    ): EmojiCollection {
        const items: EmojiItem[] = [];

        for (let i = 0; i < categoryData.container.length; i++) {
            const item = categoryData.container[i];

            try {
                const emojiItem = this.parseEmojiItem(item, categoryName, categoryData.type, i);
                if (EmojiValidator.validateEmojiItem(emojiItem)) {
                    items.push(EmojiValidator.sanitizeEmojiItem(emojiItem));
                } else {
                    console.warn(`Invalid emoji item at index ${i} in category ${categoryName}`);
                }
            } catch (error) {
                console.warn(`Failed to parse emoji item at index ${i} in category ${categoryName}:`, error.message);
            }
        }

        // Validate unique keys within collection
        if (!EmojiValidator.validateUniqueKeys(items)) {
            console.warn(`Duplicate emoji keys found in category ${categoryName} from ${filePath}`);
        }

        const collection: EmojiCollection = {
            name: categoryName,
            type: categoryData.type,
            items,
            source: filePath
        };

        return collection;
    }

    /**
     * Parse a single emoji item from OWO format
     */
    private static parseEmojiItem(
        item: { icon: string; text: string },
        category: string,
        type: 'emoticon' | 'emoji' | 'image',
        index: number
    ): EmojiItem {
        if (!item.icon || !item.text) {
            throw new Error('Missing required icon or text field');
        }

        // Generate a unique key based on category and index
        const key = `${category.toLowerCase().replace(/\s+/g, '_')}_${index}`;

        let processedIcon = item.icon;
        let url: string | undefined;

        // For image type, extract URL from HTML img tag if present
        if (type === 'image') {
            const extractedUrl = this.extractUrlFromHtml(item.icon);
            if (extractedUrl) {
                url = extractedUrl;
                processedIcon = extractedUrl; // Use the URL as the icon for consistency
            } else {
                // If no HTML tag, treat the icon as direct URL
                url = item.icon;
            }
        }

        const emojiItem: EmojiItem = {
            key,
            icon: processedIcon,
            text: item.text,
            type,
            category,
            url
        };

        return emojiItem;
    }

    /**
     * Extract URL from HTML img tag
     */
    private static extractUrlFromHtml(htmlString: string): string | null {
        // Match src attribute in img tag
        const srcMatch = htmlString.match(/src=['"]([^'"]+)['"]/i);
        return srcMatch ? srcMatch[1] : null;
    }

    /**
     * Validate the basic structure of an OWO file
     */
    static validateOwoStructure(data: unknown): data is OwoFileStructure {
        if (!data || typeof data !== 'object') {
            return false;
        }

        for (const [categoryName, categoryData] of Object.entries(data)) {
            if (typeof categoryName !== 'string' || !categoryName.trim()) {
                return false;
            }

            if (!categoryData || typeof categoryData !== 'object') {
                return false;
            }

            const category = categoryData as Record<string, unknown>;

            // Check required fields
            if (!category.type || !['emoticon', 'emoji', 'image'].includes(category.type as string)) {
                return false;
            }

            if (!Array.isArray(category.container)) {
                return false;
            }

            // Validate container items
            for (const item of category.container) {
                if (!item || typeof item !== 'object') {
                    return false;
                }

                const containerItem = item as Record<string, unknown>;

                if (typeof containerItem.icon !== 'string' || !containerItem.icon.trim()) {
                    return false;
                }

                if (typeof containerItem.text !== 'string' || !containerItem.text.trim()) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Merge multiple emoji collections, handling name conflicts
     */
    static mergeCollections(collections: EmojiCollection[]): EmojiCollection[] {
        const mergedMap = new Map<string, EmojiCollection>();

        for (const collection of collections) {
            const existingCollection = mergedMap.get(collection.name);

            if (existingCollection) {
                // Merge items from collections with the same name
                const mergedItems = [...existingCollection.items, ...collection.items];

                // Remove duplicates based on key
                const uniqueItems = mergedItems.filter((item, index, array) =>
                    array.findIndex(i => i.key === item.key) === index
                );

                mergedMap.set(collection.name, {
                    ...existingCollection,
                    items: uniqueItems,
                    source: `${existingCollection.source}, ${collection.source}`
                });
            } else {
                mergedMap.set(collection.name, collection);
            }
        }

        return Array.from(mergedMap.values());
    }
}