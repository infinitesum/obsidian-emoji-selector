/**
 * Demo file to test virtual scrolling functionality
 * This file demonstrates how the VirtualEmojiRenderer works
 */

import { VirtualEmojiRenderer } from '../virtual-emoji-renderer';
import { EmojiItem } from '../types';

/**
 * Create mock emoji data for testing
 */
function createMockEmojis(count: number): EmojiItem[] {
    const emojis: EmojiItem[] = [];
    const emojiIcons = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚'];

    for (let i = 0; i < count; i++) {
        emojis.push({
            key: `emoji-${i}`,
            icon: emojiIcons[i % emojiIcons.length],
            text: `Emoji ${i}`,
            type: 'emoji',
            category: `category-${Math.floor(i / 20)}`
        });
    }

    return emojis;
}

/**
 * Demo function to test virtual scrolling performance
 */
export function testVirtualScrolling(): void {
    console.log('🚀 Testing Virtual Scrolling Performance');

    // Create test containers
    const scrollContainer = document.createElement('div');
    const container = document.createElement('div');

    // Set up container styles for testing
    scrollContainer.style.cssText = `
        width: 600px;
        height: 400px;
        overflow-y: auto;
        border: 1px solid #ccc;
        position: relative;
    `;

    container.style.cssText = `
        position: relative;
        width: 100%;
    `;

    scrollContainer.appendChild(container);

    // Mock getBoundingClientRect for testing
    Object.defineProperty(container, 'getBoundingClientRect', {
        value: () => ({ width: 600, height: 400 })
    });
    Object.defineProperty(scrollContainer, 'getBoundingClientRect', {
        value: () => ({ width: 600, height: 400 })
    });

    // Create virtual renderer
    const renderer = new VirtualEmojiRenderer(
        container,
        scrollContainer,
        (emoji: EmojiItem) => {
            console.log(`Clicked emoji: ${emoji.icon} (${emoji.text})`);
        },
        'demo-emoji'
    );

    // Test with different emoji counts
    const testCounts = [100, 500, 1000, 2000];

    testCounts.forEach(count => {
        console.log(`\n📊 Testing with ${count} emojis:`);

        const startTime = performance.now();
        const emojis = createMockEmojis(count);
        const createTime = performance.now() - startTime;

        const renderStartTime = performance.now();
        renderer.setEmojis(emojis);
        const renderTime = performance.now() - renderStartTime;

        const visibleRange = renderer.getVisibleRange();

        console.log(`  ⏱️  Emoji creation: ${createTime.toFixed(2)}ms`);
        console.log(`  🎨 Initial render: ${renderTime.toFixed(2)}ms`);
        console.log(`  👀 Visible range: ${visibleRange.start} - ${visibleRange.end}`);
        console.log(`  📈 Total emojis: ${renderer.getTotalCount()}`);

        // Test finding emojis
        const findStartTime = performance.now();
        const foundIndex = renderer.findEmojiIndex(`emoji-${Math.floor(count / 2)}`);
        const findTime = performance.now() - findStartTime;

        console.log(`  🔍 Find emoji time: ${findTime.toFixed(4)}ms (found at index ${foundIndex})`);

        // Test getting emoji at index
        const getStartTime = performance.now();
        const emoji = renderer.getEmojiAt(foundIndex);
        const getTime = performance.now() - getStartTime;

        console.log(`  📝 Get emoji time: ${getTime.toFixed(4)}ms (${emoji?.text})`);
    });

    // Test scrolling performance
    console.log('\n🔄 Testing scroll performance:');
    const scrollTests = [0, 50, 100, 500, 1000, 1500];

    scrollTests.forEach(scrollIndex => {
        const scrollStartTime = performance.now();
        renderer.scrollToEmoji(scrollIndex);
        const scrollTime = performance.now() - scrollStartTime;

        console.log(`  📍 Scroll to emoji ${scrollIndex}: ${scrollTime.toFixed(2)}ms`);
    });

    // Test dimension updates
    console.log('\n📏 Testing dimension updates:');
    const dimensionStartTime = performance.now();
    renderer.updateItemDimensions(80, 80);
    const dimensionTime = performance.now() - dimensionStartTime;

    console.log(`  📐 Update dimensions: ${dimensionTime.toFixed(2)}ms`);

    // Test CSS class updates
    console.log('\n🎨 Testing CSS class updates:');
    const cssStartTime = performance.now();
    renderer.updateCustomCssClasses('new-demo-class');
    const cssTime = performance.now() - cssStartTime;

    console.log(`  🎭 Update CSS classes: ${cssTime.toFixed(2)}ms`);

    // Clean up
    renderer.destroy();
    console.log('\n✅ Virtual scrolling tests completed successfully!');
}

/**
 * Performance comparison between virtual scrolling and traditional rendering
 */
export function comparePerformance(): void {
    console.log('\n⚡ Performance Comparison: Virtual vs Traditional Rendering');

    const emojiCount = 1000;
    const emojis = createMockEmojis(emojiCount);

    // Test traditional rendering (simulate)
    console.log('\n📊 Traditional Rendering (simulated):');
    const traditionalStartTime = performance.now();

    // Simulate creating DOM elements for all emojis
    const fragment = document.createDocumentFragment();
    emojis.forEach((emoji, index) => {
        const element = document.createElement('div');
        element.className = 'emoji-item';
        element.textContent = emoji.icon;
        element.setAttribute('data-key', emoji.key);
        fragment.appendChild(element);
    });

    const traditionalTime = performance.now() - traditionalStartTime;
    console.log(`  🐌 Traditional render time: ${traditionalTime.toFixed(2)}ms`);
    console.log(`  📦 DOM elements created: ${emojiCount}`);

    // Test virtual rendering
    console.log('\n🚀 Virtual Rendering:');
    const container = document.createElement('div');
    const scrollContainer = document.createElement('div');
    scrollContainer.appendChild(container);

    // Mock dimensions
    Object.defineProperty(container, 'getBoundingClientRect', {
        value: () => ({ width: 600, height: 400 })
    });
    Object.defineProperty(scrollContainer, 'getBoundingClientRect', {
        value: () => ({ width: 600, height: 400 })
    });

    const virtualStartTime = performance.now();
    const renderer = new VirtualEmojiRenderer(
        container,
        scrollContainer,
        () => { },
        'demo'
    );

    renderer.setEmojis(emojis);
    const virtualTime = performance.now() - virtualStartTime;

    const visibleRange = renderer.getVisibleRange();
    const visibleCount = visibleRange.end - visibleRange.start;

    console.log(`  ⚡ Virtual render time: ${virtualTime.toFixed(2)}ms`);
    console.log(`  👀 DOM elements created: ${visibleCount} (only visible ones)`);
    console.log(`  📈 Performance improvement: ${((traditionalTime - virtualTime) / traditionalTime * 100).toFixed(1)}%`);
    console.log(`  💾 Memory savings: ${((emojiCount - visibleCount) / emojiCount * 100).toFixed(1)}% fewer DOM elements`);

    renderer.destroy();
}

// Export for potential use in browser console
if (typeof window !== 'undefined') {
    (window as any).testVirtualScrolling = testVirtualScrolling;
    (window as any).comparePerformance = comparePerformance;
}