import { OutfitTracker } from "../data/tracker.js";
import { isWideScreen } from "../shared.js";
import { mergeClassNames } from "../util/element/css.js";
import { clampPosition, enforceViewportBounds } from "../util/element/position.js";
import { el, toggleClasses } from "../util/ElementHelper.js";
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
        this.dropBus = new EventBus();
        this.focusBus = new EventBus();
        // Event registration
        this.onDispose = (disposer) => this.disposer.add(disposer);
    }
    onHide(listener) {
        this.hideBus.add(listener);
    }
    onExpand(listener) {
        this.expandedBus.add(listener);
    }
    onDrop(listener) {
        this.dropBus.add(listener);
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
            enforceViewportBounds(this.panelEl);
        }
    }
    saveAndRender() {
        this.outfitManager.saveSettings();
        this.renderTabsAndActiveContent();
    }
    makePanelDraggable() {
        if (!this.panelEl)
            return;
        const handle = this.panelEl.querySelector(".outfit-header");
        if (!handle)
            return;
        let offsetX = 0;
        let offsetY = 0;
        let width = 0;
        let height = 0;
        const start = (e) => {
            var _a;
            if (!this.panelEl)
                return;
            if (this.isFullscreen())
                return;
            handle.setPointerCapture(e.pointerId);
            const rect = this.panelEl.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            width = rect.width;
            height = rect.height;
            (_a = this.panelEl.style).position || (_a.position = 'absolute');
            this.panelEl.style.right = "auto";
            this.panelEl.style.left = rect.left + "px";
            this.panelEl.style.top = rect.top + "px";
            handle.addEventListener("pointermove", move);
            handle.addEventListener("pointerup", stop);
            handle.addEventListener("pointercancel", stop);
        };
        const move = (e) => {
            if (!this.panelEl)
                return;
            if (e.pointerType === 'touch') {
                e.preventDefault();
            }
            const x = e.clientX - offsetX;
            const y = e.clientY - offsetY;
            clampPosition({
                element: this.panelEl,
                x,
                y,
                width,
                height
            });
        };
        const stop = (e) => {
            if (handle.hasPointerCapture(e.pointerId)) {
                handle.releasePointerCapture(e.pointerId);
            }
            handle.removeEventListener("pointermove", move);
            handle.removeEventListener("pointerup", stop);
            handle.removeEventListener("pointercancel", stop);
            if (!this.panelEl)
                return;
            const left = parseFloat(this.panelEl.style.left);
            const top = parseFloat(this.panelEl.style.top);
            const mode = isWideScreen() ? 'desktop' : 'mobile';
            const panelSettings = this.getPanelSettings();
            if (panelSettings.isXYSaved()) {
                panelSettings.setXY(mode, left, top);
                this.outfitManager.saveSettings();
            }
            this.dropBus.emit({
                mode,
                cursor: {
                    x: e.clientX,
                    y: e.clientY
                },
                panel: {
                    x: left,
                    y: top
                }
            });
        };
        handle.addEventListener("pointerdown", (e) => {
            if (e.target !== handle)
                return;
            start(e);
        });
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
        const title = this.panelEl.querySelector(".outfit-header h3");
        if (!title)
            return;
        let startX = 0;
        let startY = 0;
        let pressTimer = null;
        let dragging = false;
        const DRAG_THRESHOLD = 7; // px
        const HOLD_THRESHOLD = 150; // ms
        title.addEventListener("pointerdown", (e) => {
            startX = e.clientX;
            startY = e.clientY;
            dragging = false;
            // Start timer: if held long enough, treat as drag
            pressTimer = window.setTimeout(() => {
                dragging = true;
                this.beginDragFromEvent(e); // <— you'll add this below
            }, HOLD_THRESHOLD);
        });
        title.addEventListener("pointermove", (e) => {
            if (!pressTimer)
                return;
            const dx = Math.abs(e.clientX - startX);
            const dy = Math.abs(e.clientY - startY);
            // If finger moves enough → start dragging right away
            if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
                dragging = true;
                clearTimeout(pressTimer);
                pressTimer = null;
                this.beginDragFromEvent(e); // <— hook into your drag logic
            }
        });
        title.addEventListener("pointerup", (e) => {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
                if (!dragging && e.button === 0) {
                    // Treat as tap
                    this.toggleMinimize();
                }
            }
            dragging = false;
        });
        title.addEventListener("pointercancel", () => {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
            dragging = false;
        });
    }
    createOutfitActions() {
        const action = (options) => el('span', {
            ...options,
            className: mergeClassNames('outfit-action', 'no-highlight', options.className)
        });
        const actions = [
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
            })
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
        this.show({
            restoreX: x === undefined,
            restoreY: x === undefined
        });
        this.setMinimize(true);
        if (!this.panelEl)
            return;
        this.panelEl.style.left = `${x}px`;
        this.panelEl.style.top = `${y}px`;
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
        const { restoreX = false, restoreY = false, forcePos = false, resetSizeAndPos = false } = options;
        const initialized = this.initializePanel();
        if (resetSizeAndPos) {
            this.resetSizeAndPos();
        }
        else if (forcePos) {
            this.restoreSize();
            this.forcePos();
        }
        else if (initialized) {
            this.restoreSizeAndPos(restoreX, restoreY);
        }
        if (this.panelEl) {
            this.panelEl.hidden = false;
        }
        this.visible = true;
        this.renderTabsAndActiveContent();
        return true;
    }
    /**
     * Hides the DOM until `show()` is called
     */
    close() {
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
