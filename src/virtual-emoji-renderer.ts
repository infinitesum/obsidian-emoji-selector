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
        this.setupEventDelegation();
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
     * Set up event delegation for efficient emoji click handling
     * Replaces individual emoji listeners with a single delegated listener
     */
    private setupEventDelegation(): void {
        // Use event delegation instead of individual listeners for better performance
        this.container.addEventListener('click', (event) => {
            const target = event.target as HTMLElement;

            // Find the closest emoji item element
            const emojiElement = target.closest('.emoji-item') as HTMLElement;
            if (!emojiElement) return;

            // Get the emoji key from the data attribute
            const emojiKey = emojiElement.getAttribute('data-emoji-key');
            if (!emojiKey) return;

            // Find the emoji object by key
            const emoji = this.emojis.find(e => e.key === emojiKey);
            if (emoji) {
                this.onEmojiClick(emoji);
            }
        });

        // Add keyboard navigation support for the container
        this.container.addEventListener('keydown', (event) => {
            this.handleContainerKeyNavigation(event);
        });
    }

    /**
     * Handle keyboard navigation within the emoji container
     */
    private handleContainerKeyNavigation(event: KeyboardEvent): void {
        // Only handle navigation if container is focused
        if (document.activeElement !== this.container) return;

        const selectedElement = this.container.querySelector('.emoji-selected') as HTMLElement;
        if (!selectedElement) return;

        const emojiKey = selectedElement.getAttribute('data-emoji-key');
        if (!emojiKey) return;

        const currentIndex = this.emojis.findIndex(e => e.key === emojiKey);
        if (currentIndex === -1) return;

        let newIndex = currentIndex;

        switch (event.key) {
            case 'ArrowRight':
                event.preventDefault();
                newIndex = Math.min(currentIndex + 1, this.emojis.length - 1);
                break;
            case 'ArrowLeft':
                event.preventDefault();
                newIndex = Math.max(currentIndex - 1, 0);
                break;
            case 'ArrowDown':
                event.preventDefault();
                newIndex = Math.min(currentIndex + this.itemsPerRow, this.emojis.length - 1);
                break;
            case 'ArrowUp':
                event.preventDefault();
                newIndex = Math.max(currentIndex - this.itemsPerRow, 0);
                break;
            case 'Enter':
            case ' ':
                event.preventDefault();
                const emoji = this.emojis[currentIndex];
                if (emoji) {
                    this.onEmojiClick(emoji);
                }
                return;
        }

        if (newIndex !== currentIndex) {
            this.selectEmojiByIndex(newIndex);
        }
    }

    /**
     * Select emoji by index and ensure it's visible
     */
    public selectEmojiByIndex(index: number): void {
        if (index < 0 || index >= this.emojis.length) return;

        // Remove previous selection
        const previousSelected = this.container.querySelector('.emoji-selected');
        if (previousSelected) {
            previousSelected.classList.remove('emoji-selected');
        }

        // Ensure the emoji is visible
        this.scrollToEmoji(index);

        // Add selection to new emoji (after a brief delay to ensure rendering)
        setTimeout(() => {
            const emoji = this.emojis[index];
            const emojiElement = this.container.querySelector(`[data-emoji-key="${emoji.key}"]`);
            if (emojiElement) {
                emojiElement.classList.add('emoji-selected');
            }
        }, 50);
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
        // Force re-render when emojis change, even if visible range is the same
        this.forceRender();
    }

    /**
     * Force re-render of visible items (used when emoji content changes)
     */
    private forceRender(): void {
        // Calculate the visible range
        this.calculateVisibleRange();
        // Always render, even if range hasn't changed
        this.renderVisibleItems();
    }

    /**
     * Calculate visible range without triggering render
     */
    private calculateVisibleRange(): void {
        if (this.emojis.length === 0 || this.itemsPerRow === 0) {
            this.visibleRange = { start: 0, end: 0 };
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

        this.visibleRange = { start: startIndex, end: endIndex };
    }

    /**
     * Update the visible range based on scroll position
     */
    private updateVisibleRange(): void {
        const oldStart = this.visibleRange.start;
        const oldEnd = this.visibleRange.end;

        // Calculate new visible range
        this.calculateVisibleRange();

        // Only render if range changed
        if (this.visibleRange.start !== oldStart || this.visibleRange.end !== oldEnd) {
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

        // No individual click handler needed - using event delegation
        // Make element focusable for keyboard navigation
        emojiElement.setAttribute('tabindex', '-1');

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