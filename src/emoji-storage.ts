import { EmojiItem, EmojiCollection } from './types';

/**
 * Optimized in-memory storage for emoji collections with efficient search indexing
 */
export class EmojiStorage {
    private collections: Map<string, EmojiCollection> = new Map();
    private emojiIndex: Map<string, EmojiItem> = new Map();

    // Search indexes for O(1) lookups
    private keySearchIndex: Map<string, Set<string>> = new Map();
    private textSearchIndex: Map<string, Set<string>> = new Map();
    private categorySearchIndex: Map<string, Set<string>> = new Map();

    // Category-based organization for efficient filtering
    private categoryIndex: Map<string, Set<string>> = new Map();

    // Cache for frequently accessed data
    private allEmojisCache: EmojiItem[] | null = null;
    private totalEmojiCount: number = 0;

    /**
     * Add a collection to storage
     */
    addCollection(collection: EmojiCollection): void {
        this.collections.set(collection.name, collection);
        this.rebuildIndexes();
    }

    /**
     * Add multiple collections at once (more efficient)
     */
    addCollections(collections: EmojiCollection[]): void {
        for (const collection of collections) {
            this.collections.set(collection.name, collection);
        }
        this.rebuildIndexes(); // Only rebuild once
    }

    /**
     * Remove a collection from storage
     */
    removeCollection(name: string): void {
        this.collections.delete(name);
        this.rebuildIndexes();
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
     * Get all emojis from all collections (cached for performance)
     */
    getAllEmojis(): EmojiItem[] {
        if (this.allEmojisCache === null) {
            this.allEmojisCache = Array.from(this.emojiIndex.values());
        }
        return [...this.allEmojisCache];
    }

    /**
     * Get emoji by key (O(1) lookup)
     */
    getEmojiByKey(key: string): EmojiItem | undefined {
        return this.emojiIndex.get(key);
    }

    /**
     * Get emojis by category (O(1) lookup)
     */
    getEmojisByCategory(category: string): EmojiItem[] {
        const emojiKeys = this.categoryIndex.get(category.toLowerCase());
        if (!emojiKeys) {
            return [];
        }

        const emojis: EmojiItem[] = [];
        for (const key of emojiKeys) {
            const emoji = this.emojiIndex.get(key);
            if (emoji) {
                emojis.push(emoji);
            }
        }
        return emojis;
    }

    /**
     * Efficient indexed search that finds ANY substring match
     */
    searchEmojis(query: string): EmojiItem[] {
        if (!query.trim()) {
            return this.getAllEmojis();
        }

        const searchTerm = query.toLowerCase().trim();
        const matchingKeys = new Set<string>();

        // Search in different indexes and combine results
        this.addMatchingKeysFromIndex(this.keySearchIndex, searchTerm, matchingKeys);
        this.addMatchingKeysFromIndex(this.textSearchIndex, searchTerm, matchingKeys);
        this.addMatchingKeysFromIndex(this.categorySearchIndex, searchTerm, matchingKeys);

        // Convert keys to emoji objects
        const results: EmojiItem[] = [];
        for (const key of matchingKeys) {
            const emoji = this.emojiIndex.get(key);
            if (emoji) {
                results.push(emoji);
            }
        }

        return results;
    }

    /**
     * Advanced search with multiple terms and category filtering
     */
    advancedSearch(query: string, category?: string): EmojiItem[] {
        if (!query.trim() && !category) {
            return this.getAllEmojis();
        }

        let results: EmojiItem[];

        if (category) {
            // Start with category filter
            results = this.getEmojisByCategory(category);

            if (!query.trim()) {
                return results;
            }

            // Further filter by search query
            const searchTerm = query.toLowerCase().trim();
            results = results.filter(emoji =>
                this.matchesSearchTerm(emoji, searchTerm)
            );
        } else {
            // Use optimized search
            results = this.searchEmojis(query);
        }

        return results;
    }

    /**
     * Advanced search with regex, fuzzy matching, and collection name filtering
     * Supports patterns like "活字乱刷.*a" to search collection "活字乱刷" for emojis containing "a"
     * Also supports pure regex patterns and fuzzy matching
     */
    advancedSearchWithCollections(query: string, enableRegex: boolean = true, enableFuzzy: boolean = true): EmojiItem[] {
        if (!query.trim()) {
            return this.getAllEmojis();
        }

        const trimmedQuery = query.trim();

        // Try to parse collection-specific search pattern: "collectionName.*searchTerm"
        const collectionSearchMatch = trimmedQuery.match(/^(.+?)\.\*(.*)$/);

        if (collectionSearchMatch) {
            const [, collectionPattern, searchPattern] = collectionSearchMatch;
            return this.searchInCollections(collectionPattern, searchPattern, enableRegex, enableFuzzy);
        }

        // Check if query looks like a regex pattern and regex is enabled
        if (enableRegex && this.isRegexPattern(trimmedQuery)) {
            return this.regexSearch(trimmedQuery, enableFuzzy);
        }

        // Default to fuzzy search with collection name matching (if enabled)
        if (enableFuzzy) {
            return this.fuzzySearchWithCollections(trimmedQuery);
        } else {
            // Fall back to basic search if fuzzy is disabled
            return this.searchEmojis(trimmedQuery);
        }
    }

    /**
     * Search within specific collections matching a pattern
     */
    private searchInCollections(collectionPattern: string, searchPattern: string, enableRegex: boolean = true, enableFuzzy: boolean = true): EmojiItem[] {
        const results: EmojiItem[] = [];
        const collectionRegex = this.createFuzzyRegex(collectionPattern);

        for (const [collectionName, collection] of this.collections.entries()) {
            // Check if collection name matches the pattern
            if (collectionRegex.test(collectionName)) {
                // Search within this collection
                const collectionResults = this.searchInSpecificCollection(collection, searchPattern, enableRegex, enableFuzzy);
                results.push(...collectionResults);
            }
        }

        return this.removeDuplicates(results);
    }

    /**
     * Search within a specific collection
     */
    private searchInSpecificCollection(collection: EmojiCollection, searchPattern: string, enableRegex: boolean = true, enableFuzzy: boolean = true): EmojiItem[] {
        if (!searchPattern.trim()) {
            return collection.items;
        }

        const results: EmojiItem[] = [];

        for (const emoji of collection.items) {
            if (this.matchesAdvancedPattern(emoji, searchPattern, enableRegex, enableFuzzy)) {
                results.push(emoji);
            }
        }

        return results;
    }

    /**
     * Regex-based search across all emojis
     */
    private regexSearch(pattern: string, enableFuzzy: boolean = true): EmojiItem[] {
        try {
            const regex = new RegExp(pattern, 'i'); // Case insensitive
            const results: EmojiItem[] = [];

            for (const emoji of this.emojiIndex.values()) {
                if (this.matchesRegex(emoji, regex)) {
                    results.push(emoji);
                }
            }

            return results;
        } catch (error) {
            // If regex is invalid, fall back to fuzzy search or basic search
            console.warn('Invalid regex pattern, falling back to alternative search:', error);
            if (enableFuzzy) {
                return this.fuzzySearchWithCollections(pattern);
            } else {
                return this.searchEmojis(pattern);
            }
        }
    }

    /**
     * Fuzzy search that includes collection names in the search
     */
    private fuzzySearchWithCollections(query: string): EmojiItem[] {
        const results: EmojiItem[] = [];
        const queryLower = query.toLowerCase();

        // First, try exact and substring matches (fast path)
        const exactResults = this.searchEmojis(query);
        results.push(...exactResults);

        // Then, search by collection names
        const collectionResults = this.searchByCollectionName(queryLower);
        results.push(...collectionResults);

        // Finally, fuzzy matching for remaining cases
        const fuzzyResults = this.performFuzzySearch(queryLower);
        results.push(...fuzzyResults);

        return this.removeDuplicates(results);
    }

    /**
     * Search emojis by collection name
     */
    private searchByCollectionName(query: string): EmojiItem[] {
        const results: EmojiItem[] = [];

        for (const [collectionName, collection] of this.collections.entries()) {
            if (collectionName.toLowerCase().includes(query)) {
                // If collection name matches, include all its emojis
                results.push(...collection.items);
            }
        }

        return results;
    }

    /**
     * Perform fuzzy search using Levenshtein distance and other fuzzy matching techniques
     */
    private performFuzzySearch(query: string): EmojiItem[] {
        const results: EmojiItem[] = [];
        const maxDistance = Math.max(1, Math.floor(query.length * 0.3)); // Allow 30% character differences

        for (const emoji of this.emojiIndex.values()) {
            if (this.isFuzzyMatch(emoji, query, maxDistance)) {
                results.push(emoji);
            }
        }

        return results;
    }

    /**
     * Check if a query looks like a regex pattern
     */
    private isRegexPattern(query: string): boolean {
        // Check for common regex metacharacters
        const regexChars = /[.*+?^${}()|[\]\\]/;
        return regexChars.test(query);
    }

    /**
     * Create a fuzzy regex from a pattern (converts wildcards and handles fuzzy matching)
     */
    private createFuzzyRegex(pattern: string): RegExp {
        // Escape special regex characters except * and ?
        let regexPattern = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');

        // Convert wildcards
        regexPattern = regexPattern.replace(/\*/g, '.*').replace(/\?/g, '.');

        // Make it case insensitive and allow partial matches
        return new RegExp(regexPattern, 'i');
    }

    /**
     * Check if emoji matches advanced pattern
     */
    private matchesAdvancedPattern(emoji: EmojiItem, pattern: string, enableRegex: boolean = true, enableFuzzy: boolean = true): boolean {
        // Try regex matching first if enabled
        if (enableRegex) {
            try {
                const regex = this.createFuzzyRegex(pattern);
                if (regex.test(emoji.key) || regex.test(emoji.text) || regex.test(emoji.category)) {
                    return true;
                }
            } catch (error) {
                // Ignore regex errors and continue with other matching methods
            }
        }

        // Try basic substring matching
        const lowerPattern = pattern.toLowerCase();
        if (emoji.key.toLowerCase().includes(lowerPattern) ||
            emoji.text.toLowerCase().includes(lowerPattern) ||
            emoji.category.toLowerCase().includes(lowerPattern)) {
            return true;
        }

        // Try fuzzy matching if enabled
        if (enableFuzzy) {
            return this.isFuzzyMatch(emoji, pattern, Math.max(1, Math.floor(pattern.length * 0.3)));
        }

        return false;
    }

    /**
     * Check if emoji matches regex pattern
     */
    private matchesRegex(emoji: EmojiItem, regex: RegExp): boolean {
        return regex.test(emoji.key) ||
            regex.test(emoji.text) ||
            regex.test(emoji.category);
    }

    /**
     * Check if emoji is a fuzzy match using multiple techniques
     */
    private isFuzzyMatch(emoji: EmojiItem, query: string, maxDistance: number): boolean {
        const targets = [emoji.key.toLowerCase(), emoji.text.toLowerCase(), emoji.category.toLowerCase()];

        for (const target of targets) {
            // Levenshtein distance check
            if (this.levenshteinDistance(target, query) <= maxDistance) {
                return true;
            }

            // Subsequence matching (characters appear in order but not necessarily consecutive)
            if (this.isSubsequence(query, target)) {
                return true;
            }

            // Soundex matching for phonetic similarity (simplified)
            if (this.soundexMatch(query, target)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Calculate Levenshtein distance between two strings
     */
    private levenshteinDistance(str1: string, str2: string): number {
        const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

        for (let i = 0; i <= str1.length; i++) {
            matrix[0][i] = i;
        }

        for (let j = 0; j <= str2.length; j++) {
            matrix[j][0] = j;
        }

        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1, // deletion
                    matrix[j - 1][i] + 1, // insertion
                    matrix[j - 1][i - 1] + indicator // substitution
                );
            }
        }

        return matrix[str2.length][str1.length];
    }

    /**
     * Check if query is a subsequence of target (characters appear in order)
     */
    private isSubsequence(query: string, target: string): boolean {
        let queryIndex = 0;

        for (let i = 0; i < target.length && queryIndex < query.length; i++) {
            if (target[i] === query[queryIndex]) {
                queryIndex++;
            }
        }

        return queryIndex === query.length;
    }

    /**
     * Simple soundex-like matching for phonetic similarity
     */
    private soundexMatch(query: string, target: string): boolean {
        if (query.length < 3 || target.length < 3) {
            return false;
        }

        // Simple phonetic matching: same first letter and similar consonant patterns
        if (query[0] !== target[0]) {
            return false;
        }

        const queryConsonants = query.replace(/[aeiou]/g, '');
        const targetConsonants = target.replace(/[aeiou]/g, '');

        return this.levenshteinDistance(queryConsonants, targetConsonants) <= 1;
    }

    /**
     * Remove duplicate emojis from results array
     */
    private removeDuplicates(emojis: EmojiItem[]): EmojiItem[] {
        const seen = new Set<string>();
        const unique: EmojiItem[] = [];

        for (const emoji of emojis) {
            if (!seen.has(emoji.key)) {
                seen.add(emoji.key);
                unique.push(emoji);
            }
        }

        return unique;
    }

    /**
     * Get all available categories
     */
    getAllCategories(): string[] {
        return Array.from(this.categoryIndex.keys());
    }

    /**
     * Clear all collections and emojis
     */
    clear(): void {
        this.collections.clear();
        this.emojiIndex.clear();
        this.keySearchIndex.clear();
        this.textSearchIndex.clear();
        this.categorySearchIndex.clear();
        this.categoryIndex.clear();
        this.allEmojisCache = null;
        this.totalEmojiCount = 0;
    }

    /**
     * Get total number of emojis across all collections (cached)
     */
    getTotalEmojiCount(): number {
        return this.totalEmojiCount;
    }

    /**
     * Get total number of collections
     */
    getCollectionCount(): number {
        return this.collections.size;
    }

    /**
     * Get memory usage statistics
     */
    getMemoryStats(): {
        totalEmojis: number;
        totalCollections: number;
        indexSizes: {
            keyIndex: number;
            textIndex: number;
            categoryIndex: number;
        };
    } {
        return {
            totalEmojis: this.totalEmojiCount,
            totalCollections: this.collections.size,
            indexSizes: {
                keyIndex: this.keySearchIndex.size,
                textIndex: this.textSearchIndex.size,
                categoryIndex: this.categorySearchIndex.size,
            }
        };
    }

    /**
     * Rebuild all indexes for optimal search performance
     */
    private rebuildIndexes(): void {
        // Clear existing indexes
        this.emojiIndex.clear();
        this.keySearchIndex.clear();
        this.textSearchIndex.clear();
        this.categorySearchIndex.clear();
        this.categoryIndex.clear();
        this.allEmojisCache = null;
        this.totalEmojiCount = 0;

        // Rebuild indexes from collections
        for (const collection of this.collections.values()) {
            for (const emoji of collection.items) {
                // Main emoji index
                this.emojiIndex.set(emoji.key, emoji);
                this.totalEmojiCount++;

                // Build search indexes
                this.addToSearchIndex(this.keySearchIndex, emoji.key.toLowerCase(), emoji.key);
                this.addToSearchIndex(this.textSearchIndex, emoji.text.toLowerCase(), emoji.key);
                this.addToSearchIndex(this.categorySearchIndex, emoji.category.toLowerCase(), emoji.key);

                // Category index
                const categoryKey = emoji.category.toLowerCase();
                if (!this.categoryIndex.has(categoryKey)) {
                    this.categoryIndex.set(categoryKey, new Set());
                }
                this.categoryIndex.get(categoryKey)!.add(emoji.key);
            }
        }
    }

    /**
     * Add terms to search index for efficient ANY substring matching
     * Creates comprehensive substring indexes for O(1) lookups
     */
    private addToSearchIndex(index: Map<string, Set<string>>, text: string, emojiKey: string): void {
        // Add full text
        if (!index.has(text)) {
            index.set(text, new Set());
        }
        index.get(text)!.add(emojiKey);

        // Add all substrings for comprehensive matching
        this.addAllSubstrings(index, text, emojiKey);

        // Also process individual words
        const words = text.split(/[\s\-_]+/);
        for (const word of words) {
            if (word.length >= 2) {
                // Add the full word
                if (!index.has(word)) {
                    index.set(word, new Set());
                }
                index.get(word)!.add(emojiKey);

                // Add all substrings of the word
                this.addAllSubstrings(index, word, emojiKey);
            }
        }
    }

    /**
     * Add all substrings of a text to the index for comprehensive matching
     * Optimized to balance memory usage with search performance
     * Now includes single character indexing
     */
    private addAllSubstrings(index: Map<string, Set<string>>, text: string, emojiKey: string): void {
        const maxLength = Math.min(text.length, 8); // Limit to 8 chars to control memory usage

        for (let start = 0; start < text.length; start++) {
            // Include single characters (len = 1) for comprehensive search
            for (let len = 1; len <= maxLength && start + len <= text.length; len++) {
                const substring = text.substring(start, start + len);

                if (!index.has(substring)) {
                    index.set(substring, new Set());
                }
                index.get(substring)!.add(emojiKey);
            }
        }
    }

    /**
     * Find matching keys from a search index with efficient O(1) lookup
     * Now supports single character searches
     */
    private addMatchingKeysFromIndex(
        index: Map<string, Set<string>>,
        searchTerm: string,
        matchingKeys: Set<string>
    ): void {
        // For search terms 1-8 chars, use direct O(1) lookup from substring index
        if (searchTerm.length >= 1 && searchTerm.length <= 8) {
            const directMatch = index.get(searchTerm);
            if (directMatch) {
                for (const key of directMatch) {
                    matchingKeys.add(key);
                }
            }
        } else if (searchTerm.length > 8) {
            // For longer search terms, fall back to substring matching
            // This handles edge cases where the search term is longer than our indexed substrings
            for (const [indexTerm, keys] of index.entries()) {
                if (indexTerm.includes(searchTerm) || searchTerm.includes(indexTerm)) {
                    for (const key of keys) {
                        matchingKeys.add(key);
                    }
                }
            }
        }
    }

    /**
     * Check if emoji matches search term with comprehensive matching
     */
    private matchesSearchTerm(emoji: EmojiItem, searchTerm: string): boolean {
        const lowerKey = emoji.key.toLowerCase();
        const lowerText = emoji.text.toLowerCase();
        const lowerCategory = emoji.category.toLowerCase();

        // Direct substring matching in key, text, and category
        return lowerKey.includes(searchTerm) ||
            lowerText.includes(searchTerm) ||
            lowerCategory.includes(searchTerm) ||
            // Also check word boundaries for better matching
            this.matchesWordBoundary(lowerKey, searchTerm) ||
            this.matchesWordBoundary(lowerText, searchTerm) ||
            this.matchesWordBoundary(lowerCategory, searchTerm);
    }

    /**
     * Check if search term matches at word boundaries
     */
    private matchesWordBoundary(text: string, searchTerm: string): boolean {
        // Split by common delimiters and check if any word starts with search term
        const words = text.split(/[\s\-_]+/);
        return words.some(word => word.startsWith(searchTerm));
    }

    /**
     * Natural search implementation for performance comparison
     * Uses simple substring matching without indexes
     */
    searchEmojisNatural(query: string): EmojiItem[] {
        if (!query.trim()) {
            return this.getAllEmojis();
        }

        const searchTerm = query.toLowerCase().trim();
        const results: EmojiItem[] = [];

        // Search through all emojis directly
        for (const emoji of this.emojiIndex.values()) {
            if (this.matchesSearchTerm(emoji, searchTerm)) {
                results.push(emoji);
            }
        }

        return results;
    }

    /**
     * Performance comparison between indexed and natural search
     * Returns detailed performance metrics
     */
    compareSearchPerformance(testQueries: string[]): {
        indexedSearch: {
            totalTime: number;
            averageTime: number;
            results: number[];
        };
        naturalSearch: {
            totalTime: number;
            averageTime: number;
            results: number[];
        };
        speedupFactor: number;
        memoryUsage: {
            indexSizes: { keyIndex: number; textIndex: number; categoryIndex: number };
            totalIndexEntries: number;
        };
    } {
        const indexedResults: number[] = [];
        const naturalResults: number[] = [];

        // Warm up both methods
        this.searchEmojis('test');
        this.searchEmojisNatural('test');

        // Test indexed search
        const indexedStart = performance.now();
        for (const query of testQueries) {
            const results = this.searchEmojis(query);
            indexedResults.push(results.length);
        }
        const indexedEnd = performance.now();
        const indexedTime = indexedEnd - indexedStart;

        // Test natural search
        const naturalStart = performance.now();
        for (const query of testQueries) {
            const results = this.searchEmojisNatural(query);
            naturalResults.push(results.length);
        }
        const naturalEnd = performance.now();
        const naturalTime = naturalEnd - naturalStart;

        const memoryStats = this.getMemoryStats();
        const totalIndexEntries = memoryStats.indexSizes.keyIndex +
            memoryStats.indexSizes.textIndex +
            memoryStats.indexSizes.categoryIndex;

        return {
            indexedSearch: {
                totalTime: indexedTime,
                averageTime: indexedTime / testQueries.length,
                results: indexedResults
            },
            naturalSearch: {
                totalTime: naturalTime,
                averageTime: naturalTime / testQueries.length,
                results: naturalResults
            },
            speedupFactor: naturalTime / indexedTime,
            memoryUsage: {
                indexSizes: memoryStats.indexSizes,
                totalIndexEntries
            }
        };
    }

    /**
     * Generate comprehensive test queries for performance testing
     */
    generateTestQueries(): string[] {
        const queries: string[] = [];

        // Single character queries
        for (let i = 97; i <= 122; i++) { // a-z
            queries.push(String.fromCharCode(i));
        }

        // Common 2-3 character prefixes
        const commonPrefixes = ['ha', 'sm', 'lo', 'ca', 'he', 'an', 'th', 'in', 'er', 'on'];
        queries.push(...commonPrefixes);

        // Common words
        const commonWords = ['happy', 'smile', 'love', 'heart', 'face', 'cat', 'dog', 'food', 'sun', 'moon'];
        queries.push(...commonWords);

        // Longer phrases
        const phrases = ['happy face', 'smiling cat', 'heart eyes', 'thumbs up', 'peace sign'];
        queries.push(...phrases);

        // Edge cases
        queries.push('', ' ', 'xyz123notfound', 'verylongquerythatprobablywontmatchanything');

        return queries;
    }

    /**
     * Run a comprehensive performance benchmark
     */
    runPerformanceBenchmark(): void {
        console.log('🚀 Starting Emoji Search Performance Benchmark');
        console.log(`📊 Testing with ${this.getTotalEmojiCount()} emojis across ${this.getCollectionCount()} collections`);

        const testQueries = this.generateTestQueries();
        console.log(`🔍 Running ${testQueries.length} test queries`);

        const results = this.compareSearchPerformance(testQueries);

        console.log('\n📈 Performance Results:');
        console.log(`⚡ Indexed Search: ${results.indexedSearch.totalTime.toFixed(2)}ms total, ${results.indexedSearch.averageTime.toFixed(3)}ms average`);
        console.log(`🐌 Natural Search: ${results.naturalSearch.totalTime.toFixed(2)}ms total, ${results.naturalSearch.averageTime.toFixed(3)}ms average`);
        console.log(`🚀 Speedup Factor: ${results.speedupFactor.toFixed(1)}x faster`);

        console.log('\n💾 Memory Usage:');
        console.log(`📝 Key Index: ${results.memoryUsage.indexSizes.keyIndex} entries`);
        console.log(`📝 Text Index: ${results.memoryUsage.indexSizes.textIndex} entries`);
        console.log(`📝 Category Index: ${results.memoryUsage.indexSizes.categoryIndex} entries`);
        console.log(`📝 Total Index Entries: ${results.memoryUsage.totalIndexEntries}`);
        console.log(`📝 Memory Overhead: ~${(results.memoryUsage.totalIndexEntries * 50 / 1024).toFixed(1)}KB estimated`);

        // Verify results consistency
        const inconsistencies = results.indexedSearch.results.filter((count, i) =>
            count !== results.naturalSearch.results[i]
        ).length;

        if (inconsistencies === 0) {
            console.log('✅ All search results are consistent between methods');
        } else {
            console.log(`❌ Found ${inconsistencies} inconsistencies in search results`);
        }

        console.log('\n🎯 Benchmark Complete!');
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