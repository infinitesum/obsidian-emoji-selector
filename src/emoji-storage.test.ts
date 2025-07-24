/**
 * Tests for optimized EmojiStorage class
 */

import { EmojiStorage } from './emoji-storage';
import { EmojiItem, EmojiCollection } from './types';

describe('EmojiStorage Optimization Tests', () => {
    let storage: EmojiStorage;
    let testCollection: EmojiCollection;

    beforeEach(() => {
        storage = new EmojiStorage();

        testCollection = {
            name: 'test-collection',
            type: 'emoji',
            source: 'test.json',
            items: [
                {
                    key: 'happy',
                    icon: '😊',
                    text: 'happy face',
                    type: 'emoji',
                    category: 'smileys'
                },
                {
                    key: 'cat',
                    icon: '🐱',
                    text: 'cat face',
                    type: 'emoji',
                    category: 'animals'
                },
                {
                    key: 'pizza',
                    icon: '🍕',
                    text: 'pizza slice',
                    type: 'emoji',
                    category: 'food'
                },
                {
                    key: 'car',
                    icon: '🚗',
                    text: 'red car',
                    type: 'emoji',
                    category: 'travel'
                }
            ]
        };

        storage.addCollection(testCollection);
    });

    describe('Map-based lookups', () => {
        test('should provide O(1) emoji lookup by key', () => {
            const emoji = storage.getEmojiByKey('happy');
            expect(emoji).toBeDefined();
            expect(emoji?.key).toBe('happy');
            expect(emoji?.text).toBe('happy face');
        });

        test('should return undefined for non-existent key', () => {
            const emoji = storage.getEmojiByKey('nonexistent');
            expect(emoji).toBeUndefined();
        });

        test('should provide fast category-based lookups', () => {
            const smileys = storage.getEmojisByCategory('smileys');
            expect(smileys).toHaveLength(1);
            expect(smileys[0].key).toBe('happy');

            const animals = storage.getEmojisByCategory('animals');
            expect(animals).toHaveLength(1);
            expect(animals[0].key).toBe('cat');
        });

        test('should return empty array for non-existent category', () => {
            const emojis = storage.getEmojisByCategory('nonexistent');
            expect(emojis).toEqual([]);
        });
    });

    describe('Search indexing', () => {
        test('should find emojis by exact key match', () => {
            const results = storage.searchEmojis('happy');
            expect(results).toHaveLength(1);
            expect(results[0].key).toBe('happy');
        });

        test('should find emojis by partial key match', () => {
            const results = storage.searchEmojis('hap');
            expect(results).toHaveLength(1);
            expect(results[0].key).toBe('happy');
        });

        test('should find emojis by text content', () => {
            const results = storage.searchEmojis('face');
            expect(results).toHaveLength(2); // happy face and cat face
            expect(results.map(r => r.key)).toContain('happy');
            expect(results.map(r => r.key)).toContain('cat');
        });

        test('should find emojis by category', () => {
            const results = storage.searchEmojis('animals');
            expect(results).toHaveLength(1);
            expect(results[0].key).toBe('cat');
        });

        test('should return all emojis for empty query', () => {
            const results = storage.searchEmojis('');
            expect(results).toHaveLength(4);
        });

        test('should return all emojis for whitespace-only query', () => {
            const results = storage.searchEmojis('   ');
            expect(results).toHaveLength(4);
        });

        test('should handle case-insensitive search', () => {
            const results = storage.searchEmojis('HAPPY');
            expect(results).toHaveLength(1);
            expect(results[0].key).toBe('happy');
        });
    });

    describe('Advanced search', () => {
        test('should filter by category and search term', () => {
            const results = storage.advancedSearch('face', 'animals');
            expect(results).toHaveLength(1);
            expect(results[0].key).toBe('cat');
        });

        test('should return category emojis when no search term provided', () => {
            const results = storage.advancedSearch('', 'food');
            expect(results).toHaveLength(1);
            expect(results[0].key).toBe('pizza');
        });

        test('should return all emojis when no category or search term', () => {
            const results = storage.advancedSearch('');
            expect(results).toHaveLength(4);
        });

        test('should handle non-existent category gracefully', () => {
            const results = storage.advancedSearch('test', 'nonexistent');
            expect(results).toEqual([]);
        });
    });

    describe('Memory efficiency', () => {
        test('should cache getAllEmojis results', () => {
            const first = storage.getAllEmojis();
            const second = storage.getAllEmojis();

            // Should return new arrays (defensive copying)
            expect(first).not.toBe(second);
            expect(first).toEqual(second);
        });

        test('should provide accurate memory statistics', () => {
            const stats = storage.getMemoryStats();

            expect(stats.totalEmojis).toBe(4);
            expect(stats.totalCollections).toBe(1);
            expect(stats.indexSizes.keyIndex).toBeGreaterThan(0);
            expect(stats.indexSizes.textIndex).toBeGreaterThan(0);
            expect(stats.indexSizes.categoryIndex).toBeGreaterThan(0);
        });

        test('should maintain accurate count after operations', () => {
            expect(storage.getTotalEmojiCount()).toBe(4);

            storage.removeCollection('test-collection');
            expect(storage.getTotalEmojiCount()).toBe(0);

            storage.addCollection(testCollection);
            expect(storage.getTotalEmojiCount()).toBe(4);
        });
    });

    describe('Category management', () => {
        test('should return all available categories', () => {
            const categories = storage.getAllCategories();
            expect(categories).toContain('smileys');
            expect(categories).toContain('animals');
            expect(categories).toContain('food');
            expect(categories).toContain('travel');
            expect(categories).toHaveLength(4);
        });

        test('should update categories when collections change', () => {
            const newCollection: EmojiCollection = {
                name: 'new-collection',
                type: 'emoji',
                source: 'new.json',
                items: [
                    {
                        key: 'heart',
                        icon: '❤️',
                        text: 'red heart',
                        type: 'emoji',
                        category: 'symbols'
                    }
                ]
            };

            storage.addCollection(newCollection);
            const categories = storage.getAllCategories();
            expect(categories).toContain('symbols');
            expect(categories).toHaveLength(5);
        });
    });

    describe('Index rebuilding', () => {
        test('should rebuild indexes when collection is removed', () => {
            expect(storage.searchEmojis('happy')).toHaveLength(1);

            storage.removeCollection('test-collection');
            expect(storage.searchEmojis('happy')).toHaveLength(0);
            expect(storage.getTotalEmojiCount()).toBe(0);
        });

        test('should rebuild indexes when collection is added', () => {
            const newCollection: EmojiCollection = {
                name: 'new-collection',
                type: 'emoji',
                source: 'new.json',
                items: [
                    {
                        key: 'smile',
                        icon: '😄',
                        text: 'big smile',
                        type: 'emoji',
                        category: 'smileys'
                    }
                ]
            };

            storage.addCollection(newCollection);
            expect(storage.searchEmojis('smile')).toHaveLength(1);
            expect(storage.getTotalEmojiCount()).toBe(5);
        });

        test('should clear all data when cleared', () => {
            storage.clear();

            expect(storage.getTotalEmojiCount()).toBe(0);
            expect(storage.getCollectionCount()).toBe(0);
            expect(storage.getAllEmojis()).toHaveLength(0);
            expect(storage.getAllCategories()).toHaveLength(0);
            expect(storage.searchEmojis('happy')).toHaveLength(0);
        });
    });
});