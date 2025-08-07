import { Modal, App } from 'obsidian';
import { EmojiItem, EmojiCollection } from './types';
import { VirtualEmojiRenderer } from './virtual-emoji-renderer';
import EmojiSelectorPlugin from '../main';
import { i18n } from './i18n';

/**
 * Modal for selecting emojis with search functionality
 */
export class EmojiPickerModal extends Modal {
    private plugin: EmojiSelectorPlugin;
    private searchInput: HTMLInputElement;
    private emojiContainer: HTMLElement;
    private emojiScrollContainer: HTMLElement;
    private tabsContainer: HTMLElement;
    private multiSelectToggle: HTMLInputElement;
    private filteredEmojis: EmojiItem[] = [];
    private onEmojiSelect: (emoji: EmojiItem, isMultiSelectMode: boolean) => void;
    private selectedIndex: number = -1;
    private activeCollection: string = '';
    private collections: EmojiCollection[] = [];
    private isLoading: boolean = false;
    private isMultiSelectMode: boolean = false;
    private virtualRenderer: VirtualEmojiRenderer | null = null;
    private userExplicitlySelectedRecent: boolean = false;

    constructor(app: App, plugin: EmojiSelectorPlugin, onEmojiSelect: (emoji: EmojiItem, isMultiSelectMode: boolean) => void) {
        super(app);
        this.plugin = plugin;
        this.onEmojiSelect = onEmojiSelect;
    }

    onOpen(): void {
        const startTime = performance.now();

        const { contentEl } = this;
        contentEl.empty();

        // Add specific class to modal for CSS targeting
        contentEl.closest('.modal')?.addClass('emoji-picker-modal');

        // Show UI shell immediately (Requirement 2.1)
        this.createUIShell();

        // Set up event listeners
        this.setupEventListeners();

        // Load emojis progressively in background (Requirement 2.2)
        this.loadEmojisProgressively();

        // Auto-focus search input
        this.focusSearchInput();

        // Performance metrics calculated but not logged to avoid console clutter
    }

    /**
     * Create the UI shell immediately for fast modal opening (Requirement 2.1)
     */
    private createUIShell(): void {
        const { contentEl } = this;

        // Create header with title and multi-select toggle
        const headerContainer = contentEl.createDiv('emoji-header-container');

        // Create multi-select toggle
        const toggleContainer = headerContainer.createDiv('emoji-multi-select-container');
        const toggleLabel = toggleContainer.createEl('label', {
            cls: 'emoji-multi-select-label',
            text: i18n.t('multiSelect')
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
            placeholder: this.plugin.settings.searchPlaceholder || i18n.t('searchPlaceholder'),
            cls: 'emoji-search-input'
        });

        // Create tabs container
        this.tabsContainer = contentEl.createDiv('emoji-tabs');

        // Create emoji scroll container for virtual scrolling
        this.emojiScrollContainer = contentEl.createDiv('emoji-scroll-container');

        // Create emoji container with initial loading state
        this.emojiContainer = this.emojiScrollContainer.createDiv('emoji-container');

        // Make container focusable for keyboard navigation
        this.emojiContainer.setAttribute('tabindex', '0');

        // Show initial loading indicator (Requirement 2.3)
        this.showInitialLoadingState();
    }



    onClose(): void {
        // Clean up virtual renderer
        if (this.virtualRenderer) {
            this.virtualRenderer.destroy();
            this.virtualRenderer = null;
        }

        const { contentEl } = this;
        contentEl.empty();
    }

    /**
     * Initialize the virtual emoji renderer
     */
    private initializeVirtualRenderer(): void {
        if (this.virtualRenderer) {
            this.virtualRenderer.destroy();
        }

        this.virtualRenderer = new VirtualEmojiRenderer(
            this.emojiContainer,
            this.emojiScrollContainer,
            async (emoji: EmojiItem) => await this.handleEmojiClick(emoji),
            this.plugin.settings.customCssClasses
        );
    }

    /**
     * Set up event listeners for the modal with optimized event delegation
     */
    private setupEventListeners(): void {
        // Optimized search input handling with improved debouncing
        this.setupOptimizedSearchHandling();

        // Enhanced keyboard navigation
        this.setupEnhancedKeyboardNavigation();

        // Multi-select toggle event listener
        this.multiSelectToggle.addEventListener('change', (event) => {
            const target = event.target as HTMLInputElement;
            this.isMultiSelectMode = target.checked;
            this.updateMultiSelectUI();
        });

        // Initialize virtual renderer after container is created
        this.initializeVirtualRenderer();

        // Event delegation for tab clicks (already optimized)
        this.tabsContainer.addEventListener('click', async (event) => {
            const tabElement = (event.target as HTMLElement).closest('.emoji-tab');
            if (tabElement) {
                const tabText = tabElement.getAttribute('data-raw-name');
                if (tabText) {
                    let collectionName = tabText;
                    if (tabText.toLowerCase() === 'all') {
                        collectionName = 'all';
                    } else if (tabText.toLowerCase() === 'recent') {
                        collectionName = 'recent';
                    }
                    await this.switchToCollection(collectionName);
                }
            }
        });
    }

    /**
     * Set up optimized search input handling with mobile-friendly debouncing
     */
    private setupOptimizedSearchHandling(): void {
        let searchTimeout: NodeJS.Timeout;
        let lastSearchValue: string = '';

        // Simple, mobile-friendly search handler
        const performSearch = async (value: string) => {
            // Skip if value hasn't changed
            if (value === lastSearchValue) return;

            lastSearchValue = value;
            await this.handleSearchInput(value);
        };

        // Input event with mobile-optimized debouncing
        this.searchInput.addEventListener('input', async (event) => {
            const target = event.target as HTMLInputElement;
            const value = target.value;

            // Clear previous timeout
            clearTimeout(searchTimeout);

            // Immediate response for empty search (clearing)
            if (value === '') {
                await performSearch(value);
                return;
            }

            // Immediate search for single characters to fix mobile issues
            if (value.length === 1) {
                await performSearch(value);
                return;
            }

            // Very short debounce for multi-character searches - optimized for mobile
            searchTimeout = setTimeout(async () => {
                await performSearch(value);
            }, 50); // Reduced from 100ms to 50ms for better mobile responsiveness
        });

        // Handle paste events with minimal delay
        this.searchInput.addEventListener('paste', () => {
            clearTimeout(searchTimeout);
            setTimeout(async () => {
                await performSearch(this.searchInput.value);
            }, 50);
        });
    }

    /**
     * Set up enhanced keyboard navigation with better performance
     */
    private setupEnhancedKeyboardNavigation(): void {
        let navigationTimeout: NodeJS.Timeout;

        // Throttled navigation to prevent excessive updates
        const throttledNavigation = (handler: () => void) => {
            clearTimeout(navigationTimeout);
            navigationTimeout = setTimeout(handler, 16); // ~60fps
        };

        this.searchInput.addEventListener('keydown', (event) => {
            switch (event.key) {
                case 'Escape':
                    this.close();
                    break;
                case 'ArrowDown':
                    event.preventDefault();
                    throttledNavigation(() => this.navigateDown());
                    break;
                case 'ArrowUp':
                    event.preventDefault();
                    throttledNavigation(() => this.navigateUp());
                    break;
                case 'ArrowRight':
                case 'ArrowLeft':
                    // Allow horizontal navigation within search input
                    // Only handle if at start/end of input
                    if (event.key === 'ArrowRight' && this.searchInput.selectionStart === this.searchInput.value.length) {
                        event.preventDefault();
                        this.focusEmojiContainer();
                    } else if (event.key === 'ArrowLeft' && this.searchInput.selectionStart === 0) {
                        event.preventDefault();
                        this.focusEmojiContainer();
                    }
                    break;
                case 'Enter':
                    event.preventDefault();
                    this.selectCurrentEmoji();
                    break;
                case 'Tab':
                    // Handle tab navigation between collections
                    if (event.shiftKey) {
                        event.preventDefault();
                        this.navigateToPreviousTab();
                    } else {
                        event.preventDefault();
                        this.navigateToNextTab();
                    }
                    break;
                case 'm':
                case 'M':
                    // Toggle multi-select mode with Ctrl/Cmd + M
                    if (event.ctrlKey || event.metaKey) {
                        event.preventDefault();
                        this.toggleMultiSelectMode();
                    }
                    break;
            }
        });
    }

    /**
     * Focus the emoji container for keyboard navigation
     */
    private focusEmojiContainer(): void {
        if (this.emojiContainer) {
            this.emojiContainer.focus();
            // Select first emoji if none selected
            if (this.selectedIndex === -1 && this.filteredEmojis.length > 0) {
                this.selectedIndex = 0;
                this.updateSelection();
            }
        }
    }

    /**
     * Navigate to the next tab
     */
    private navigateToNextTab(): void {
        const tabs = Array.from(this.tabsContainer.querySelectorAll('.emoji-tab'));
        const activeTab = tabs.find(tab => tab.classList.contains('active'));

        if (activeTab) {
            const currentIndex = tabs.indexOf(activeTab);
            const nextIndex = (currentIndex + 1) % tabs.length;
            const nextTab = tabs[nextIndex] as HTMLElement;

            if (nextTab) {
                nextTab.click();
            }
        }
    }

    /**
     * Navigate to the previous tab
     */
    private navigateToPreviousTab(): void {
        const tabs = Array.from(this.tabsContainer.querySelectorAll('.emoji-tab'));
        const activeTab = tabs.find(tab => tab.classList.contains('active'));

        if (activeTab) {
            const currentIndex = tabs.indexOf(activeTab);
            const prevIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
            const prevTab = tabs[prevIndex] as HTMLElement;

            if (prevTab) {
                prevTab.click();
            }
        }
    }

    /**
     * Load emojis progressively without blocking UI (Requirement 2.2)
     */
    private async loadEmojisProgressively(): Promise<void> {
        if (this.isLoading) return;
        this.isLoading = true;

        try {
            // Check if we have cached data first
            const hasCachedData = this.plugin.emojiManager.getTotalEmojiCount() > 0;

            if (hasCachedData) {
                // Use cached data immediately
                this.collections = this.plugin.emojiManager.getAllCollections();
                await this.setInitialActiveCollection();
                await this.renderTabs();
                await this.showCollectionEmojis(this.activeCollection);
            } else {
                // Load fresh data
                this.showProgressiveLoadingState();
                await this.plugin.emojiManager.loadEmojiCollections();
                this.collections = this.plugin.emojiManager.getAllCollections();

                if (this.collections.length === 0) {
                    this.showNoConfigMessage();
                    return;
                }

                await this.setInitialActiveCollection();
                await this.renderTabs();
                await this.showCollectionEmojis(this.activeCollection);
            }

        } catch (error) {
            console.error('Failed to load emojis:', error);
            this.showErrorMessage(error.message);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Load fresh emoji data and update UI
     */
    private async loadFreshEmojiData(): Promise<void> {
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
            await this.setInitialActiveCollection();

            // Render tabs and emojis
            await this.renderTabs();
            await this.showCollectionEmojis(this.activeCollection);

        } catch (error) {
            console.error('Failed to load fresh emoji data:', error);
            this.showErrorMessage(error.message);
            throw error;
        }
    }

    /**
     * Load fresh data in background while showing cached data
     */
    private async loadFreshDataInBackground(): Promise<void> {
        try {
            // Small delay to let UI render first
            await new Promise(resolve => setTimeout(resolve, 50));

            // Load fresh data
            await this.plugin.emojiManager.loadEmojiCollections();

            // Update collections if new data is available
            const newCollections = this.plugin.emojiManager.getAllCollections();
            if (newCollections.length > 0) {
                this.collections = newCollections;

                // Update tabs if needed
                await this.renderTabs();

                // Update current view if needed
                await this.showCollectionEmojis(this.activeCollection);

                // Clear any loading indicators
                this.clearLoadingIndicators();
            }

        } catch (error) {
            console.warn('Background data refresh failed:', error);
            // Don't show error for background refresh - cached data is still usable
            this.clearLoadingIndicators();
        }
    }

    /**
     * Show initial loading state immediately when modal opens (Requirement 2.3)
     */
    private showInitialLoadingState(): void {
        if (this.virtualRenderer) {
            this.virtualRenderer.setEmojis([]);
        }
        this.emojiContainer.empty();
        this.tabsContainer.empty();
        const loadingDiv = this.emojiContainer.createDiv('emoji-loading');
        loadingDiv.textContent = i18n.t('loadingEmojis');
    }

    /**
     * Show progressive loading state with better UX (Requirement 2.3)
     */
    private showProgressiveLoadingState(): void {
        if (this.virtualRenderer) {
            this.virtualRenderer.setEmojis([]);
        }
        this.emojiContainer.empty();
        this.tabsContainer.empty();
        const loadingDiv = this.emojiContainer.createDiv('emoji-loading');
        loadingDiv.textContent = i18n.t('fetchingEmojiCollections');
    }

    /**
     * Show indicator that cached data is being used (Requirement 2.3)
     */
    private showCachedDataIndicator(): void {
        // Add a subtle indicator that cached data is being used
        const existingIndicator = this.emojiContainer.querySelector('.emoji-cached-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }

        const indicator = this.emojiContainer.createDiv('emoji-cached-indicator');
        indicator.textContent = i18n.t('usingCachedData');

        // Auto-remove after 2 seconds
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.remove();
            }
        }, 2000);
    }

    /**
     * Clear all loading indicators (Requirement 2.3)
     */
    private clearLoadingIndicators(): void {
        const cachedIndicator = this.emojiContainer.querySelector('.emoji-cached-indicator');
        if (cachedIndicator) {
            cachedIndicator.remove();
        }

        const loadingElements = this.emojiContainer.querySelectorAll('.emoji-loading');
        loadingElements.forEach(element => element.remove());
    }

    /**
     * Show no configuration message
     */
    private showNoConfigMessage(): void {
        if (this.virtualRenderer) {
            this.virtualRenderer.setEmojis([]);
        }
        this.emojiContainer.empty();
        const noConfigDiv = this.emojiContainer.createDiv('emoji-no-config');
        noConfigDiv.createEl('p', { text: i18n.t('noEmojiCollections') });
        noConfigDiv.createEl('p', { text: i18n.t('addOwoJsonUrls') });
    }

    /**
     * Show error message
     */
    private showErrorMessage(errorMessage: string): void {
        if (this.virtualRenderer) {
            this.virtualRenderer.setEmojis([]);
        }
        this.emojiContainer.empty();
        const errorDiv = this.emojiContainer.createDiv('emoji-error');
        errorDiv.createEl('p', { text: i18n.t('failedToLoadCollections') });
        errorDiv.createEl('p', { text: i18n.t('error') + errorMessage });
        errorDiv.createEl('p', { text: i18n.t('checkOwoJsonUrls') });
    }

    /**
     * Set initial active collection with intelligent priority handling
     * Priority: Recent (if enabled and has items) -> Remembered -> Default
     */
    private async setInitialActiveCollection(): Promise<void> {
        // Strategy 1: Check if we should prefer recent emojis
        if (this.plugin.settings.enableRecentEmojis && this.plugin.settings.preferRecentOverRemembered) {
            const recentCount = await this.plugin.emojiManager.getRecentEmojisCount();
            if (recentCount > 0) {
                this.activeCollection = 'recent';
                return;
            }
        }

        // Strategy 2: Use remembered collection if enabled
        if (this.plugin.settings.rememberLastCollection) {
            const lastSelected = this.plugin.settings.lastSelectedCollection;

            // Check if last selected collection still exists
            if (lastSelected === 'all' ||
                lastSelected === 'recent' ||
                this.collections.some(c => c.name === lastSelected)) {

                // If it's recent but recent is disabled or empty, fallback
                if (lastSelected === 'recent') {
                    if (this.plugin.settings.enableRecentEmojis) {
                        const recentCount = await this.plugin.emojiManager.getRecentEmojisCount();
                        if (recentCount > 0) {
                            this.activeCollection = 'recent';
                            return;
                        }
                    }
                    // Recent is disabled or empty, fallback to default strategy
                } else {
                    this.activeCollection = lastSelected;
                    return;
                }
            }
        }

        // Strategy 3: Check if recent should be default (when not preferring over remembered)
        if (this.plugin.settings.enableRecentEmojis && !this.plugin.settings.preferRecentOverRemembered) {
            const recentCount = await this.plugin.emojiManager.getRecentEmojisCount();
            if (recentCount > 0) {
                this.activeCollection = 'recent';
                return;
            }
        }

        // Strategy 4: Fallback to first collection or 'all'
        this.activeCollection = this.collections.length > 0 ? this.collections[0].name : 'all';
    }

    /**
     * Handle search input changes with advanced search support
     */
    private async handleSearchInput(query: string): Promise<void> {
        const trimmedQuery = query.trim();

        if (trimmedQuery === '') {
            // If search is empty, show emojis based on active collection
            await this.showCollectionEmojis(this.activeCollection);
        } else {
            // Use advanced search that supports regex, fuzzy matching, and collection filtering
            const searchResults = this.plugin.emojiManager.advancedSearchWithCollections(trimmedQuery);

            // Only update if search results changed
            if (!this.areEmojiArraysEqual(this.filteredEmojis, searchResults)) {
                this.filteredEmojis = searchResults;
                this.selectedIndex = -1;
                this.renderEmojis();
            }
        }
    }

    /**
     * Handle keyboard navigation (legacy method - now handled by setupEnhancedKeyboardNavigation)
     * Kept for backward compatibility
     */
    private handleKeyboardNavigation(event: KeyboardEvent): void {
        // This method is now handled by setupEnhancedKeyboardNavigation
        // Keeping for any direct calls that might exist
        console.warn('handleKeyboardNavigation called directly - should use enhanced navigation');
    }

    /**
     * Navigate down in emoji list with optimized performance
     */
    private navigateDown(): void {
        if (this.filteredEmojis.length === 0) return;

        const newIndex = (this.selectedIndex + 1) % this.filteredEmojis.length;
        this.setSelectedIndex(newIndex);
    }

    /**
     * Navigate up in emoji list with optimized performance
     */
    private navigateUp(): void {
        if (this.filteredEmojis.length === 0) return;

        const newIndex = this.selectedIndex <= 0
            ? this.filteredEmojis.length - 1
            : this.selectedIndex - 1;
        this.setSelectedIndex(newIndex);
    }

    /**
     * Set selected index with optimized updates
     */
    private setSelectedIndex(newIndex: number): void {
        if (newIndex === this.selectedIndex) return; // Avoid unnecessary updates

        this.selectedIndex = newIndex;
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
     * Update visual selection highlighting with optimized virtual scrolling support
     */
    private updateSelection(): void {
        if (!this.virtualRenderer) return;

        // Use virtual renderer's optimized selection method
        if (this.selectedIndex >= 0 && this.selectedIndex < this.filteredEmojis.length) {
            this.virtualRenderer.selectEmojiByIndex(this.selectedIndex);
        } else {
            // Clear selection if index is invalid
            const selectedElements = this.emojiContainer.querySelectorAll('.emoji-selected');
            selectedElements.forEach(element => element.classList.remove('emoji-selected'));
        }
    }

    /**
     * Render collection tabs
     */
    private async renderTabs(): Promise<void> {
        this.tabsContainer.empty();

        // Get recent emojis count
        const recentCount = this.plugin.settings.enableRecentEmojis
            ? await this.plugin.emojiManager.getRecentEmojisCount()
            : 0;

        // Handle case where recent was selected but now has no items
        if (this.activeCollection === 'recent' && (!this.plugin.settings.enableRecentEmojis || recentCount === 0)) {
            // Fallback to a sensible default
            if (this.plugin.settings.rememberLastCollection) {
                // Try to use the previously remembered non-recent collection
                const lastSelected = this.plugin.settings.lastSelectedCollection;
                if (lastSelected !== 'recent' && (lastSelected === 'all' || this.collections.some(c => c.name === lastSelected))) {
                    this.activeCollection = lastSelected;
                } else {
                    this.activeCollection = this.collections.length > 0 ? this.collections[0].name : 'all';
                }
            } else {
                this.activeCollection = this.collections.length > 0 ? this.collections[0].name : 'all';
            }
        }

        // Create tab data array for efficient rendering
        const tabData = [];

        // Add Recent tab first if enabled and has items
        if (this.plugin.settings.enableRecentEmojis && recentCount > 0) {
            tabData.push({
                name: 'Recent',
                count: recentCount,
                isActive: this.activeCollection === 'recent'
            });
        }

        // Add collection tabs
        tabData.push(...this.collections.map(collection => ({
            name: collection.name,
            count: collection.items.length,
            isActive: this.activeCollection === collection.name
        })));

        // Add All tab
        tabData.push({
            name: 'All',
            count: this.plugin.emojiManager.getTotalEmojiCount(),
            isActive: this.activeCollection === 'all'
        });

        // Render all tabs efficiently
        tabData.forEach(({ name, count, isActive }) => {
            // Translate special tab names
            let displayName = name;
            if (name === 'All') {
                displayName = i18n.t('all');
            } else if (name === 'Recent') {
                displayName = i18n.t('recent');
            }

            const rawName = name;
            this.createTab(displayName, count, isActive, rawName);
        });
    }

    /**
     * Create a single tab element
     */
    private createTab(name: string, count: number, isActive: boolean, rawName: string): void {
        const tab = this.tabsContainer.createDiv('emoji-tab');
        tab.textContent = name;
        tab.setAttribute('data-raw-name', rawName);

        const countSpan = tab.createSpan('emoji-tab-count');
        countSpan.textContent = '(' + count + ')';

        if (isActive) {
            tab.addClass('active');
        }

        // No individual click handlers - using event delegation for better performance
    }

    /**
     * Switch to a specific collection
     */
    private async switchToCollection(collectionName: string, userInitiated: boolean = true): Promise<void> {
        if (this.activeCollection === collectionName) return;

        this.activeCollection = collectionName;

        // Track if user explicitly selected recent
        if (collectionName === 'recent' && userInitiated) {
            this.userExplicitlySelectedRecent = true;
        }

        await this.rememberCollectionSelection(collectionName);
        this.updateTabActiveState(collectionName);
        this.searchInput.value = '';

        // Show emojis for this collection
        await this.showCollectionEmojis(collectionName);
    }

    /**
     * Remember the collection selection in settings with intelligent handling
     */
    private async rememberCollectionSelection(collectionName: string): Promise<void> {
        // Only remember if the setting is enabled
        if (!this.plugin.settings.rememberLastCollection) {
            return;
        }

        // Don't update if it's the same as current
        if (this.plugin.settings.lastSelectedCollection === collectionName) {
            return;
        }

        // Special handling for recent collection
        if (collectionName === 'recent') {
            // Only remember recent if user explicitly selected it
            if (this.userExplicitlySelectedRecent) {
                this.plugin.settings.lastSelectedCollection = collectionName;
                await this.plugin.saveSettings();
            }
        } else {
            // For non-recent collections, always remember
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
            const tabText = tab.getAttribute('data-raw-name');
            let isActive = false;

            if (activeCollectionName === 'all' && (tabText === 'All' || tabText === i18n.t('all'))) {
                isActive = true;
            } else if (activeCollectionName === 'recent' && (tabText === 'Recent' || tabText === i18n.t('recent'))) {
                isActive = true;
            } else if (tabText === activeCollectionName) {
                isActive = true;
            }

            tab.toggleClass('active', isActive);
        });
    }

    /**
     * Show emojis for a specific collection
     */
    private async showCollectionEmojis(collectionName: string): Promise<void> {
        // Get emojis for the collection
        const newEmojis = await this.getEmojisForCollection(collectionName);

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
    private async getEmojisForCollection(collectionName: string): Promise<EmojiItem[]> {
        if (collectionName === 'all') {
            return this.plugin.emojiManager.getAllEmojis();
        }

        if (collectionName === 'recent') {
            return await this.plugin.emojiManager.getRecentEmojis();
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
     * Render emojis using virtual scrolling for better performance
     */
    private renderEmojis(): void {
        // Clear loading indicators first
        this.clearLoadingIndicators();

        if (!this.virtualRenderer) {
            console.warn('Virtual renderer not initialized');
            return;
        }

        if (this.filteredEmojis.length === 0) {
            // Clear virtual renderer and show no results message
            this.virtualRenderer.setEmojis([]);

            // Remove any existing no-results message first
            const existingNoResults = this.emojiContainer.querySelector('.emoji-no-results');
            if (existingNoResults) {
                existingNoResults.remove();
            }

            const noResults = this.emojiContainer.createDiv('emoji-no-results');
            noResults.textContent = i18n.t('noEmojisFound');
            return;
        }

        // Remove any existing no-results message when we have results
        const existingNoResults = this.emojiContainer.querySelector('.emoji-no-results');
        if (existingNoResults) {
            existingNoResults.remove();
        }

        // Use virtual renderer for efficient emoji display
        this.virtualRenderer.setEmojis(this.filteredEmojis);
    }

    /**
     * Handle emoji click events
     * Implements requirement 1.2: insert emoji at current cursor position
     */
    private async handleEmojiClick(emoji: EmojiItem): Promise<void> {
        // Add to recent emojis (async but don't wait)
        this.plugin.emojiManager.addToRecent(emoji).catch(error => {
            console.warn('Failed to add emoji to recent list:', error);
        });

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