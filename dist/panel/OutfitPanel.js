import { OutfitTracker } from "../data/tracker.js";
import { isWideScreen } from "../shared.js";
import { createPanelSwitcher } from "../ui/components/button/panel-switcher.js";
import { promptOptions } from "../ui/prompt/prompt-options.js";
import { mergeClassNames } from "../util/element/css.js";
import { el, toggleClasses } from "../util/ElementHelper.js";
import { invariant } from "../util/error.js";
import { EventBus } from "../util/EventBus.js";
import { ResourceCleaner } from "./Disposer.js";
import { SlotsRenderer } from "./SlotsRenderer.js";
import { OutfitTabsRenderer as TabsRenderer } from "./TabsRenderer.js";
export class OutfitPanel {
    constructor(outfitManager) {
        this.outfitManager = outfitManager;
        this.panelEl = null;
        this.minimized = false;
        this.visible = false;
        this.disabled = false;
        this.slotsRenderer = new SlotsRenderer(this);
        this.tabsRenderer = new TabsRenderer(this);
        this.disposer = new ResourceCleaner();
        this.hideBus = new EventBus();
        this.expandedBus = new EventBus();
        this.focusBus = new EventBus();
        this.grouper = null;
        // Event registration
        this.onRenderDispose = (disposer) => this.disposer.add(disposer);
    }
    setGrouper(grouper) {
        this.grouper = grouper;
    }
    getGrouper() {
        if (!this.grouper) {
            throw new Error('Panel grouper has not been assigned');
        }
        return this.grouper;
    }
    onHide(listener) {
        this.hideBus.add(listener);
    }
    onExpand(listener) {
        this.expandedBus.add(listener);
    }
    onFocus(listener) {
        this.focusBus.add(listener);
    }
    isMinimized() {
        return this.minimized;
    }
    isVisible() {
        return this.visible;
    }
    isFullscreen() {
        return !this.isMinimized() && !isWideScreen();
    }
    get collection() {
        return this.outfitManager.getOutfitCollection();
    }
    areDisabledSlotsHidden() {
        return this.collection.areDisabledSlotsHidden();
    }
    toggleHideDisabled() {
        this.collection.hideDisabledSlots(!this.areDisabledSlotsHidden());
        this.saveAndRender();
    }
    areEmptySlotsHidden() {
        return this.collection.areEmptySlotsHidden();
    }
    toggleHideEmpty() {
        this.collection.hideEmptySlots(!this.areEmptySlotsHidden());
        this.saveAndRender();
    }
    setFront(front) {
        this.panelEl?.classList.toggle('--front', front);
    }
    getLayoutMode() {
        return isWideScreen() ? 'desktop' : 'mobile';
    }
    /**
     * @throws if panel is not mounted
     */
    getBoundingClientRect() {
        if (!this.panelEl) {
            throw new Error('Panel element is not mounted');
        }
        return this.panelEl.getBoundingClientRect();
    }
    reinitialize() {
        this.outfitManager.initializeOutfit();
        this.getPanelSettings().resetXY(this.getLayoutMode());
        this.outfitManager.saveSettings();
        this.restoreSizeAndPos();
        this.renderTabsAndActiveContent();
    }
    restoreSize() {
        if (!this.panelEl)
            return;
        const mode = this.getLayoutMode();
        this.panelEl.style.height = '80vh';
        this.panelEl.style.width = mode === 'desktop' ? '24svw' : '90svw';
    }
    restorePos(restoreX = true, restoreY = true) {
        if (!this.panelEl)
            return;
        const mode = this.getLayoutMode();
        const [x, y] = this.getSavedXY(mode);
        if (restoreX)
            this.setX(x);
        if (restoreY)
            this.setY(y);
    }
    forcePos() {
        const mode = this.getLayoutMode();
        const [x, y] = this.getPanelSettings().getXY(mode);
        this.setX(x);
        this.setY(y);
    }
    setX(x) {
        if (!this.panelEl)
            return;
        this.panelEl.style.left = `${x}px`;
    }
    setY(y) {
        if (!this.panelEl)
            return;
        this.panelEl.style.top = `${y}px`;
    }
    restoreSizeAndPos(restoreX = true, restoreY = true) {
        this.restoreSize();
        this.restorePos(restoreX, restoreY);
    }
    resetSizeAndPos() {
        this.getPanelSettings().resetXY(this.getLayoutMode());
        this.outfitManager.saveSettings();
        this.restoreSizeAndPos();
    }
    getOutfitManager() {
        return this.outfitManager;
    }
    getSlotsRenderer() {
        return this.slotsRenderer;
    }
    sendSystemMessage(message) {
        // Use toastr popup instead of /sys command
        if (OutfitTracker.areSystemMessagesEnabled()) {
            toastr.info(message, 'Outfit System', {
                timeOut: 4000,
                extendedTimeOut: 8000
            });
        }
    }
    renderTabsAndActiveContent() {
        this.disposer.dispose();
        if (!this.panelEl || this.minimized)
            return;
        this.applyTheme();
        this.expandHeader();
        const tabsContainer = this.panelEl.querySelector('.outfit-tabs');
        if (!tabsContainer)
            return;
        const contentArea = this.panelEl.querySelector('.outfit-content');
        if (!contentArea)
            return;
        this.tabsRenderer.renderTabs(tabsContainer, contentArea);
        const mode = this.getLayoutMode();
        if (mode !== 'mobile') {
            // enforceViewportBounds(this.panelEl);
        }
    }
    saveAndRender() {
        this.outfitManager.saveSettings();
        this.renderTabsAndActiveContent();
    }
    beginDragFromEvent(e) {
        const handle = this.panelEl?.querySelector(".outfit-header");
        if (!handle)
            return;
        // Simulate a pointerdown on the handle
        // So your existing dragging logic activates correctly
        handle.dispatchEvent(new PointerEvent("pointerdown", e));
    }
    makeHeaderMinimizable() {
        if (!this.panelEl)
            return;
        const title = this.panelEl.querySelector('.outfit-header h3');
        if (!title)
            return;
        title.addEventListener('click', event => {
            if (event.button !== 0)
                return;
            this.toggleMinimize();
        });
    }
    createOutfitActions() {
        const action = (options) => el('span', {
            ...options,
            className: mergeClassNames('outfit-action', 'no-highlight', options.className)
        });
        const actions = [
            createPanelSwitcher({
                currentPanel: this,
                grouper: this.getGrouper()
            }),
            action({
                className: 'minimize-button',
                text: '−',
                events: {
                    click: () => this.toggleMinimize()
                }
            }),
            action({
                className: 'refresh-button',
                text: '↻',
                events: {
                    click: () => this.reinitialize()
                }
            }),
            action({
                className: 'close-button',
                text: '×',
                events: {
                    click: () => this.close()
                }
            }),
        ];
        const actionsEl = el('div', {
            className: 'outfit-actions',
            children: actions
        });
        return actionsEl;
    }
    expandHeader() {
        if (!this.panelEl)
            return;
        const titleElement = this.panelEl.querySelector(".outfit-header h3");
        if (titleElement)
            titleElement.textContent = this.getHeaderTitle();
    }
    collapseHeader() {
        if (!this.panelEl)
            return;
        const titleEl = this.panelEl.querySelector('.outfit-header h3');
        if (titleEl)
            titleEl.textContent = "";
    }
    toggleMinimize() {
        this.setMinimize(!this.minimized);
    }
    setMinimize(minimize) {
        const changed = minimize !== this.minimized;
        this.minimized = minimize;
        this.updateMinimizeState(changed);
    }
    updateMinimizeState(changed) {
        if (!this.panelEl)
            return;
        const minimizeBtn = this.panelEl.querySelector('.minimize-button');
        toggleClasses(this.panelEl, this.minimized, 'minimized');
        toggleClasses(this.panelEl, this.isFullscreen(), 'fullscreen');
        minimizeBtn.textContent = this.minimized ? '+' : '-';
        if (this.minimized) {
            this.collapseHeader();
        }
        else {
            this.renderTabsAndActiveContent();
        }
        if (changed && !this.minimized) {
            this.expandedBus.emit();
        }
    }
    getSavedXY(mode) {
        const panelSettings = this.getPanelSettings();
        if (panelSettings.isXYSaved()) {
            return panelSettings.getXY(mode);
        }
        else {
            return panelSettings.getDefaultXY(mode);
        }
    }
    autoOpen(x, y) {
        void x;
        void y;
        this.show();
        this.setMinimize(true);
    }
    async importButtonClickListener() {
        const inputName = await promptOptions('Import from which character?', OutfitTracker.characters().characters());
        if (!inputName) {
            this.sendSystemMessage('Cancelled.');
            return;
        }
        const character = inputName;
        const collection = OutfitTracker.characterOutfits(character);
        if (!collection.hasCollection()) {
            this.sendSystemMessage(`Character ${character} has no outfit collection.`);
            return;
        }
        const current = Symbol('current_outfit');
        const outfits = [
            ...collection.getSavedOutfitNames(),
            current
        ];
        const inputOutfit = await promptOptions('Import which outfit?', outfits, option => typeof option === 'symbol' ? 'Current Outfit' : option);
        if (inputOutfit === null) {
            this.sendSystemMessage(`Cancelled.`);
            return;
        }
        if (inputOutfit === current) {
            const currentOutfit = collection.getCurrentOutfit();
            invariant(currentOutfit, 'Outfit collections should always have an existing current outfit');
            this.outfitManager.getOutfitCollection().loadOutfit(currentOutfit.snapshot());
            this.sendSystemMessage(`Successfully loaded current outfit from ${character}`);
            this.saveAndRender();
            return;
        }
        const savedOutfit = collection.getSavedOutfit(inputOutfit);
        invariant(savedOutfit, 'Saved outfit name does not exist in collection despite being queried from collection earlier');
        this.outfitManager.getOutfitCollection().loadOutfit(savedOutfit.snapshot());
        this.sendSystemMessage(`Successfully loaded saved outfit ${inputOutfit} from ${character}`);
        this.saveAndRender();
        return;
    }
    wireEvents() {
        if (!this.panelEl) {
            throw new Error('Panel must be initialized before wiring events.');
        }
        this.panelEl.addEventListener('pointerdown', () => {
            this.focusBus.emit();
        }, true // capture phase
        );
    }
    canShow() {
        return !this.disabled;
    }
    show(options = {}) {
        if (!this.canShow())
            return false;
        const initialized = this.initializePanel();
        if (this.panelEl) {
            this.panelEl.hidden = false;
        }
        this.visible = true;
        this.renderTabsAndActiveContent();
        return true;
    }
    /**
     * Hides the DOM until `show()` is called
     *
     * destroy property does nothing unless panel is a custom panel
     */
    close({ destroy = true } = {}) {
        if (this.panelEl) {
            this.panelEl.hidden = true;
        }
        this.visible = false;
        this.minimized = false;
        this.hideBus.emit();
    }
    hide() {
        if (this.panelEl) {
            this.panelEl.hidden = true;
        }
        this.visible = false;
        this.minimized = false;
        this.hideBus.emit();
    }
    toggle(resetSizeAndPos = false) {
        if (this.visible) {
            this.close();
            return;
        }
        this.show({
            resetSizeAndPos
        });
    }
    disable() {
        this.disabled = true;
        this.close();
    }
    enable() {
        this.disabled = false;
    }
    applyTheme() {
        if (!this.panelEl)
            return;
        const s = this.getPanelSettings();
        this.panelEl.style.setProperty('--panel-bg-1', s.bgColor1);
        this.panelEl.style.setProperty('--panel-bg-2', s.bgColor2);
        this.panelEl.style.setProperty('--panel-border', s.borderColor);
    }
}
