import { EmojiItem } from './types';

/**
 * Virtual scrolling renderer for emoji lists to improve performance
 * Only renders emojis that are visible in the viewport
 */
export class VirtualEmojiRenderer {
    private container: HTMLElement;
    private scrollContainer: HTMLElement;
    private emojis: EmojiItem[] = [];
    private visibleRange: { start: number; end: number } = { start: 0, end: 0 };
    private itemHeight: number = 60; // Height of each emoji item
    private itemWidth: number = 60; // Width of each emoji item
    private itemsPerRow: number = 1;
    private containerWidth: number = 0;
    private containerHeight: number = 400;
    private totalRows: number = 0;
    private overscan: number = 5; // Number of extra rows to render outside viewport
    private intersectionObserver: IntersectionObserver | null = null;
    private resizeObserver: ResizeObserver | null = null;
    private onEmojiClick: (emoji: EmojiItem) => void;
    private customCssClasses: string = '';

    constructor(
        container: HTMLElement,
        scrollContainer: HTMLElement,
        onEmojiClick: (emoji: EmojiItem) => void,
        customCssClasses: string = ''
    ) {
        this.container = container;
        this.scrollContainer = scrollContainer;
        this.onEmojiClick = onEmojiClick;
        this.customCssClasses = customCssClasses;

        this.setupContainer();
        this.setupObservers();
        this.calculateDimensions();
    }

    /**
     * Set up the container for virtual scrolling
     */
    private setupContainer(): void {
        // Ensure container has relative positioning for absolute positioned items
        this.container.style.position = 'relative';
        this.container.style.overflow = 'hidden';

        // Set up scroll container
        this.scrollContainer.style.overflowY = 'auto';
        this.scrollContainer.style.overflowX = 'hidden';
    }

    /**
     * Set up intersection observer for efficient scrolling detection
     */
    private setupObservers(): void {
        // Intersection observer to detect when container is visible
        this.intersectionObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.updateVisibleRange();
                    }
                });
            },
            {
                root: this.scrollContainer,
                rootMargin: '50px',
                threshold: 0
            }
        );

        // Observe the container
        this.intersectionObserver.observe(this.container);

        // Resize observer to handle container size changes
        this.resizeObserver = new ResizeObserver(() => {
            this.calculateDimensions();
            this.updateVisibleRange();
        });

        this.resizeObserver.observe(this.container);
        this.resizeObserver.observe(this.scrollContainer);

        // Scroll event listener for updating visible range
        this.scrollContainer.addEventListener('scroll', () => {
            this.updateVisibleRange();
        }, { passive: true });
    }

    /**
     * Calculate container dimensions and items per row
     */
    private calculateDimensions(): void {
        const containerRect = this.container.getBoundingClientRect();
        const scrollRect = this.scrollContainer.getBoundingClientRect();

        this.containerWidth = containerRect.width || this.scrollContainer.clientWidth;
        this.containerHeight = scrollRect.height || 400;

        // Calculate items per row based on container width and item width
        // Account for gaps between items (8px gap from CSS)
        const gap = 8;
        this.itemsPerRow = Math.floor((this.containerWidth + gap) / (this.itemWidth + gap)) || 1;

        // Recalculate total rows
        this.totalRows = Math.ceil(this.emojis.length / this.itemsPerRow);

        // Update container height to accommodate all items
        this.updateContainerHeight();
    }

    /**
     * Update the total height of the container for proper scrolling
     */
    private updateContainerHeight(): void {
        const totalHeight = this.totalRows * (this.itemHeight + 8); // 8px gap
        this.container.style.height = `${totalHeight}px`;
    }

    /**
     * Set the emojis to be rendered
     */
    public setEmojis(emojis: EmojiItem[]): void {
        this.emojis = emojis;
        this.calculateDimensions();
        this.updateVisibleRange();
    }

    /**
     * Update the visible range based on scroll position
     */
    private updateVisibleRange(): void {
        if (this.emojis.length === 0 || this.itemsPerRow === 0) {
            this.visibleRange = { start: 0, end: 0 };
            this.renderVisibleItems();
            return;
        }

        const scrollTop = this.scrollContainer.scrollTop;
        const gap = 8;
        const rowHeight = this.itemHeight + gap;

        // Calculate visible row range
        const startRow = Math.floor(scrollTop / rowHeight);
        const endRow = Math.ceil((scrollTop + this.containerHeight) / rowHeight);

        // Add overscan for smooth scrolling
        const startRowWithOverscan = Math.max(0, startRow - this.overscan);
        const endRowWithOverscan = Math.min(this.totalRows, endRow + this.overscan);

        // Convert row range to item range
        const startIndex = startRowWithOverscan * this.itemsPerRow;
        const endIndex = Math.min(this.emojis.length, endRowWithOverscan * this.itemsPerRow);

        // Only update if range changed
        if (this.visibleRange.start !== startIndex || this.visibleRange.end !== endIndex) {
            this.visibleRange = { start: startIndex, end: endIndex };
            this.renderVisibleItems();
        }
    }

    /**
     * Render only the visible emoji items
     */
    private renderVisibleItems(): void {
        // Clear existing emoji items but preserve other elements
        const existingEmojis = this.container.querySelectorAll('.emoji-item');
        existingEmojis.forEach(element => element.remove());

        if (this.emojis.length === 0) {
            return;
        }

        const fragment = document.createDocumentFragment();
        const gap = 8;

        // Render visible items
        for (let i = this.visibleRange.start; i < this.visibleRange.end; i++) {
            if (i >= this.emojis.length) break;

            const emoji = this.emojis[i];
            const emojiElement = this.createEmojiElement(emoji, i);
            fragment.appendChild(emojiElement);
        }

        this.container.appendChild(fragment);
    }

    /**
     * Create a single emoji element with absolute positioning
     */
    private createEmojiElement(emoji: EmojiItem, index: number): HTMLElement {
        const emojiElement = document.createElement('div');
        emojiElement.className = 'emoji-item emoji-clickable';
        emojiElement.setAttribute('data-emoji-key', emoji.key);
        emojiElement.setAttribute('title', emoji.text);

        // Calculate position
        const row = Math.floor(index / this.itemsPerRow);
        const col = index % this.itemsPerRow;
        const gap = 8;

        const left = col * (this.itemWidth + gap);
        const top = row * (this.itemHeight + gap);

        // Set absolute positioning
        emojiElement.style.position = 'absolute';
        emojiElement.style.left = `${left}px`;
        emojiElement.style.top = `${top}px`;
        emojiElement.style.width = `${this.itemWidth}px`;
        emojiElement.style.height = `${this.itemHeight}px`;

        // Create emoji display
        const emojiIcon = document.createElement('span');
        emojiIcon.className = 'emoji-icon';

        if (emoji.type === 'image' && emoji.url) {
            const img = document.createElement('img');
            img.src = emoji.url;
            img.alt = emoji.text;
            img.title = emoji.text;
            img.className = `emoji-image ${this.customCssClasses}`.trim();
            emojiIcon.appendChild(img);
        } else {
            emojiIcon.textContent = emoji.icon;
            emojiIcon.className = `emoji-icon emoji-text ${this.customCssClasses}`.trim();
            emojiIcon.setAttribute('title', emoji.text);
        }

        emojiElement.appendChild(emojiIcon);

        // Add click handler
        emojiElement.addEventListener('click', () => {
            this.onEmojiClick(emoji);
        });

        return emojiElement;
    }

    /**
     * Scroll to a specific emoji by index
     */
    public scrollToEmoji(index: number): void {
        if (index < 0 || index >= this.emojis.length) return;

        const row = Math.floor(index / this.itemsPerRow);
        const gap = 8;
        const targetScrollTop = row * (this.itemHeight + gap);

        this.scrollContainer.scrollTo({
            top: targetScrollTop,
            behavior: 'smooth'
        });
    }

    /**
     * Get the currently visible emoji indices
     */
    public getVisibleRange(): { start: number; end: number } {
        return { ...this.visibleRange };
    }

    /**
     * Update item dimensions (useful for responsive design)
     */
    public updateItemDimensions(width: number, height: number): void {
        this.itemWidth = width;
        this.itemHeight = height;
        this.calculateDimensions();
        this.updateVisibleRange();
    }

    /**
     * Update custom CSS classes for emojis
     */
    public updateCustomCssClasses(classes: string): void {
        this.customCssClasses = classes;
        // Re-render visible items to apply new classes
        this.renderVisibleItems();
    }

    /**
     * Get total number of emojis
     */
    public getTotalCount(): number {
        return this.emojis.length;
    }

    /**
     * Get emoji at specific index
     */
    public getEmojiAt(index: number): EmojiItem | null {
        return this.emojis[index] || null;
    }

    /**
     * Find emoji index by key
     */
    public findEmojiIndex(key: string): number {
        return this.emojis.findIndex(emoji => emoji.key === key);
    }

    /**
     * Clean up observers and event listeners
     */
    public destroy(): void {
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
            this.intersectionObserver = null;
        }

        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        // Remove scroll event listener
        this.scrollContainer.removeEventListener('scroll', this.updateVisibleRange.bind(this));
    }
}