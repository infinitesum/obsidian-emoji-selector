import { Modal, App, Notice } from 'obsidian';
import { EmojiItem, EmojiCollection } from './types';
import EmojiSelectorPlugin from '../main';

/**
 * Modal for selecting emojis with search functionality
 */
export class EmojiPickerModal extends Modal {
    private plugin: EmojiSelectorPlugin;
    private searchInput: HTMLInputElement;
    private emojiContainer: HTMLElement;
    private tabsContainer: HTMLElement;
    private multiSelectToggle: HTMLInputElement;
    private filteredEmojis: EmojiItem[] = [];
    private onEmojiSelect: (emoji: EmojiItem, isMultiSelectMode: boolean) => void;
    private selectedIndex: number = -1;
    private activeCollection: string = '';
    private collections: EmojiCollection[] = [];
    private isLoading: boolean = false;
    private isMultiSelectMode: boolean = false;

    constructor(app: App, plugin: EmojiSelectorPlugin, onEmojiSelect: (emoji: EmojiItem, isMultiSelectMode: boolean) => void) {
        super(app);
        this.plugin = plugin;
        this.onEmojiSelect = onEmojiSelect;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();

        // Add specific class to modal for CSS targeting
        contentEl.closest('.modal')?.addClass('emoji-picker-modal');

        // Create header with title and multi-select toggle
        const headerContainer = contentEl.createDiv('emoji-header-container');



        // Create multi-select toggle
        const toggleContainer = headerContainer.createDiv('emoji-multi-select-container');
        const toggleLabel = toggleContainer.createEl('label', {
            cls: 'emoji-multi-select-label',
            text: 'Multi-select'
        });

        this.multiSelectToggle = toggleLabel.createEl('input', {
            type: 'checkbox',
            cls: 'emoji-multi-select-toggle'
        });

        toggleLabel.createDiv('emoji-toggle-slider');

        // Create search input container
        const searchContainer = contentEl.createDiv('emoji-search-container');
        this.searchInput = searchContainer.createEl('input', {
            type: 'text',
            placeholder: this.plugin.settings.searchPlaceholder,
            cls: 'emoji-search-input'
        });

        // Create tabs container
        this.tabsContainer = contentEl.createDiv('emoji-tabs');

        // Create emoji container
        this.emojiContainer = contentEl.createDiv('emoji-container');

        // Set up event listeners
        this.setupEventListeners();

        // Load and display initial emojis
        this.loadEmojis();

        // Auto-focus search input
        this.focusSearchInput();
    }



    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
    }

    /**
     * Set up event listeners for the modal
     */
    private setupEventListeners(): void {
        // Search input event listener
        this.searchInput.addEventListener('input', (event) => {
            const target = event.target as HTMLInputElement;
            this.handleSearchInput(target.value);
        });

        // Keyboard navigation
        this.searchInput.addEventListener('keydown', (event) => {
            this.handleKeyboardNavigation(event);
        });

        // Multi-select toggle event listener
        this.multiSelectToggle.addEventListener('change', (event) => {
            const target = event.target as HTMLInputElement;
            this.isMultiSelectMode = target.checked;
            this.updateMultiSelectUI();
        });
    }

    /**
     * Load emojis from storage and display them
     */
    private async loadEmojis(): Promise<void> {
        if (this.isLoading) return;
        this.isLoading = true;

        // Show loading state
        this.showLoadingState();

        try {
            // Load emoji collections from URLs
            await this.plugin.emojiManager.loadEmojiCollections();

            // Get collections
            this.collections = this.plugin.emojiManager.getAllCollections();

            if (this.collections.length === 0) {
                this.showNoConfigMessage();
                return;
            }

            // Set active collection from last remembered selection
            this.setInitialActiveCollection();

            // Render tabs and emojis
            this.renderTabs();
            this.showCollectionEmojis(this.activeCollection);

        } catch (error) {
            console.error('Failed to load emojis:', error);
            this.showErrorMessage(error.message);
            new Notice(`Failed to load emoji collections: ${error.message}`);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Show loading state
     */
    private showLoadingState(): void {
        this.emojiContainer.empty();
        this.tabsContainer.empty();
        const loadingDiv = this.emojiContainer.createDiv('emoji-loading');
        loadingDiv.textContent = 'Loading emojis...';
    }

    /**
     * Show no configuration message
     */
    private showNoConfigMessage(): void {
        this.emojiContainer.empty();
        const noConfigDiv = this.emojiContainer.createDiv('emoji-no-config');
        noConfigDiv.innerHTML = `
            <p>No emoji collections configured.</p>
            <p>Please add OWO JSON URLs in the plugin settings.</p>
        `;
    }

    /**
     * Show error message
     */
    private showErrorMessage(errorMessage: string): void {
        this.emojiContainer.empty();
        const errorDiv = this.emojiContainer.createDiv('emoji-error');
        errorDiv.innerHTML = `
            <p>Failed to load emoji collections.</p>
            <p>Error: ${errorMessage}</p>
            <p>Please check your OWO JSON URLs in the plugin settings.</p>
        `;
    }

    /**
     * Set initial active collection from settings or default
     */
    private setInitialActiveCollection(): void {
        if (this.plugin.settings.rememberLastCollection) {
            const lastSelected = this.plugin.settings.lastSelectedCollection;

            // Check if last selected collection still exists
            if (lastSelected === 'all' || this.collections.some(c => c.name === lastSelected)) {
                this.activeCollection = lastSelected;
                return;
            }
        }

        // Fallback to first collection or 'all' if not remembering or collection doesn't exist
        this.activeCollection = this.collections.length > 0 ? this.collections[0].name : 'all';
    }

    /**
     * Handle search input changes
     */
    private handleSearchInput(query: string): void {
        const trimmedQuery = query.trim();

        if (trimmedQuery === '') {
            // If search is empty, show emojis based on active collection
            this.showCollectionEmojis(this.activeCollection);
        } else {
            // Use emoji manager for search
            const searchResults = this.plugin.emojiManager.searchEmojis(trimmedQuery);

            // Only update if search results changed
            if (!this.areEmojiArraysEqual(this.filteredEmojis, searchResults)) {
                this.filteredEmojis = searchResults;
                this.selectedIndex = -1;
                this.renderEmojis();
            }
        }
    }

    /**
     * Handle keyboard navigation
     */
    private handleKeyboardNavigation(event: KeyboardEvent): void {
        switch (event.key) {
            case 'Escape':
                this.close();
                break;
            case 'ArrowDown':
                event.preventDefault();
                this.navigateDown();
                break;
            case 'ArrowUp':
                event.preventDefault();
                this.navigateUp();
                break;
            case 'Enter':
                event.preventDefault();
                this.selectCurrentEmoji();
                break;
            case 'm':
            case 'M':
                // Toggle multi-select mode with 'M' key
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.toggleMultiSelectMode();
                }
                break;
        }
    }

    /**
     * Navigate down in emoji list
     */
    private navigateDown(): void {
        if (this.filteredEmojis.length === 0) return;

        this.selectedIndex = (this.selectedIndex + 1) % this.filteredEmojis.length;
        this.updateSelection();
    }

    /**
     * Navigate up in emoji list
     */
    private navigateUp(): void {
        if (this.filteredEmojis.length === 0) return;

        this.selectedIndex = this.selectedIndex <= 0
            ? this.filteredEmojis.length - 1
            : this.selectedIndex - 1;
        this.updateSelection();
    }

    /**
     * Select the currently highlighted emoji
     */
    private selectCurrentEmoji(): void {
        if (this.selectedIndex >= 0 && this.selectedIndex < this.filteredEmojis.length) {
            const selectedEmoji = this.filteredEmojis[this.selectedIndex];
            this.handleEmojiClick(selectedEmoji);
        }
    }

    /**
     * Update visual selection highlighting
     */
    private updateSelection(): void {
        const emojiItems = this.emojiContainer.querySelectorAll('.emoji-item');

        // Remove previous selection
        emojiItems.forEach(item => item.removeClass('emoji-selected'));

        // Add selection to current item
        if (this.selectedIndex >= 0 && this.selectedIndex < emojiItems.length) {
            emojiItems[this.selectedIndex].addClass('emoji-selected');

            // Scroll into view if needed
            emojiItems[this.selectedIndex].scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }
    }

    /**
     * Render collection tabs
     */
    private renderTabs(): void {
        this.tabsContainer.empty();

        // Create tab data array for efficient rendering
        const tabData = [
            ...this.collections.map(collection => ({
                name: collection.name,
                count: collection.items.length,
                isActive: this.activeCollection === collection.name
            })),
            {
                name: 'All',
                count: this.plugin.emojiManager.getTotalEmojiCount(),
                isActive: this.activeCollection === 'all'
            }
        ];

        // Render all tabs efficiently
        tabData.forEach(({ name, count, isActive }) => {
            this.createTab(name, count, isActive);
        });
    }

    /**
     * Create a single tab element
     */
    private createTab(name: string, count: number, isActive: boolean): void {
        const tab = this.tabsContainer.createDiv('emoji-tab');
        tab.textContent = name;

        const countSpan = tab.createSpan('emoji-tab-count');
        countSpan.textContent = `(${count})`;

        if (isActive) {
            tab.addClass('active');
        }

        tab.addEventListener('click', () => {
            this.switchToCollection(name.toLowerCase() === 'all' ? 'all' : name);
        });
    }

    /**
     * Switch to a specific collection
     */
    private switchToCollection(collectionName: string): void {
        if (this.activeCollection === collectionName) return; // Avoid unnecessary work

        this.activeCollection = collectionName;

        // Remember the selection
        this.rememberCollectionSelection(collectionName);

        // Update tab active state efficiently
        this.updateTabActiveState(collectionName);

        // Clear search when switching tabs
        this.searchInput.value = '';

        // Show emojis for this collection
        this.showCollectionEmojis(collectionName);
    }

    /**
     * Remember the collection selection in settings
     */
    private async rememberCollectionSelection(collectionName: string): Promise<void> {
        // Only remember if the setting is enabled
        if (this.plugin.settings.rememberLastCollection &&
            this.plugin.settings.lastSelectedCollection !== collectionName) {
            this.plugin.settings.lastSelectedCollection = collectionName;
            await this.plugin.saveSettings();
        }
    }

    /**
     * Update tab active state efficiently
     */
    private updateTabActiveState(activeCollectionName: string): void {
        const tabs = this.tabsContainer.querySelectorAll('.emoji-tab');

        tabs.forEach(tab => {
            const tabText = tab.textContent?.split('(')[0].trim();
            const isActive = (activeCollectionName === 'all' && tabText === 'All') || tabText === activeCollectionName;

            tab.toggleClass('active', isActive);
        });
    }

    /**
     * Show emojis for a specific collection
     */
    private showCollectionEmojis(collectionName: string): void {
        // Get emojis for the collection
        const newEmojis = this.getEmojisForCollection(collectionName);

        // Only update if emojis actually changed
        if (!this.areEmojiArraysEqual(this.filteredEmojis, newEmojis)) {
            this.filteredEmojis = newEmojis;
            this.selectedIndex = -1;
            this.renderEmojis();
        }
    }

    /**
     * Get emojis for a specific collection
     */
    private getEmojisForCollection(collectionName: string): EmojiItem[] {
        if (collectionName === 'all') {
            return this.plugin.emojiManager.getAllEmojis();
        }

        const collection = this.collections.find(c => c.name === collectionName);
        return collection ? collection.items : [];
    }

    /**
     * Check if two emoji arrays are equal (shallow comparison for efficiency)
     */
    private areEmojiArraysEqual(arr1: EmojiItem[], arr2: EmojiItem[]): boolean {
        if (arr1.length !== arr2.length) return false;
        if (arr1 === arr2) return true;
        return arr1.every((emoji, index) => emoji.key === arr2[index]?.key);
    }

    /**
     * Render emojis in the container
     */
    private renderEmojis(): void {
        this.emojiContainer.empty();

        if (this.filteredEmojis.length === 0) {
            const noResults = this.emojiContainer.createDiv('emoji-no-results');
            noResults.textContent = 'No emojis found';
            return;
        }

        this.filteredEmojis.forEach(emoji => {
            const emojiElement = this.emojiContainer.createDiv('emoji-item');
            emojiElement.setAttribute('data-emoji-key', emoji.key);
            emojiElement.setAttribute('title', emoji.text);

            // Create emoji display (only icon, no text)
            const emojiIcon = emojiElement.createSpan('emoji-icon');
            const customClasses = this.plugin.settings.customCssClasses;

            if (emoji.type === 'image' && emoji.url) {
                emojiIcon.createEl('img', {
                    attr: {
                        src: emoji.url,
                        alt: emoji.text,
                        title: emoji.text
                    },
                    cls: `emoji-image ${customClasses}`.trim()
                });
                // Size is controlled by dynamic CSS, no inline styles needed
            } else {
                emojiIcon.textContent = emoji.icon;
                emojiIcon.addClass(`emoji-text ${customClasses}`.trim());
                emojiIcon.setAttribute('title', emoji.text);
                // Size is controlled by dynamic CSS, no inline styles needed
            }

            // Add click handler
            emojiElement.addEventListener('click', () => {
                this.handleEmojiClick(emoji);
            });

            // Add hover effect
            emojiElement.addClass('emoji-clickable');
        });
    }

    /**
     * Handle emoji click events
     * Implements requirement 1.2: insert emoji at current cursor position
     */
    private handleEmojiClick(emoji: EmojiItem): void {
        // Call the callback to insert the emoji, passing multi-select mode
        this.onEmojiSelect(emoji, this.isMultiSelectMode);

        // Only close the modal if not in multi-select mode
        if (!this.isMultiSelectMode) {
            this.close();
        }
    }

    /**
     * Focus the search input (disabled on mobile to prevent virtual keyboard)
     */
    private focusSearchInput(): void {
        // Don't auto-focus on mobile devices to prevent virtual keyboard from appearing
        if (this.isMobileDevice()) {
            return;
        }

        // Use setTimeout to ensure the modal is fully rendered
        setTimeout(() => {
            this.searchInput.focus();
        }, 100);
    }

    /**
     * Detect if the current device is mobile
     */
    private isMobileDevice(): boolean {
        // Check for touch capability and screen size
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const isSmallScreen = window.innerWidth <= 768 || window.innerHeight <= 768;

        // Check user agent for mobile indicators
        const userAgent = navigator.userAgent.toLowerCase();
        const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
        const isMobileUserAgent = mobileKeywords.some(keyword => userAgent.includes(keyword));

        // Consider it mobile if it has touch AND (small screen OR mobile user agent)
        return isTouchDevice && (isSmallScreen || isMobileUserAgent);
    }

    /**
     * Update UI based on multi-select mode
     */
    private updateMultiSelectUI(): void {
        const modal = this.contentEl.closest('.modal');
        modal?.toggleClass('emoji-multi-select-active', this.isMultiSelectMode);
    }

    /**
     * Toggle multi-select mode
     */
    private toggleMultiSelectMode(): void {
        this.isMultiSelectMode = !this.isMultiSelectMode;
        this.multiSelectToggle.checked = this.isMultiSelectMode;
        this.updateMultiSelectUI();
    }


}