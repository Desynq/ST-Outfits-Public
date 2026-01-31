import { OutfitTracker } from "../data/tracker.js";
import { createConfiguredElements } from "../util/ElementHelper.js";
import { SlotsRenderer } from "./SlotsRenderer.js";
import { OutfitTabsRenderer as TabsRenderer } from "./TabsRenderer.js";
export class OutfitPanel {
    constructor(outfitManager) {
        this.outfitManager = outfitManager;
        this.panelEl = null;
        this.minimized = false;
        this.isVisible = false;
        this.slotsRenderer = new SlotsRenderer(this);
        this.tabsRenderer = new TabsRenderer(this);
    }
    isMinimized() {
        return this.minimized;
    }
    get collection() {
        return this.outfitManager.getOutfitCollection();
    }
    areDisabledSlotsHidden() {
        return this.collection.areDisabledSlotsHidden();
    }
    toggleHideDisabled() {
        this.collection.hideDisabledSlots(!this.areDisabledSlotsHidden());
        this.saveAndRenderContent();
    }
    areEmptySlotsHidden() {
        return this.collection.areEmptySlotsHidden();
    }
    toggleHideEmpty() {
        this.collection.hideEmptySlots(!this.areEmptySlotsHidden());
        this.saveAndRenderContent();
    }
    reinitialize() {
        this.outfitManager.initializeOutfit();
        this.resetPanel();
        this.render();
    }
    resetPanel(setDefaultX = true, setDefaultY = true) {
        if (!this.panelEl)
            return;
        const isWide = window.matchMedia('(min-width: 1024px)').matches;
        this.panelEl.style.height = '80vh';
        this.panelEl.style.width = isWide ? '24svw' : '90svw';
        const [x, y] = this.getDefaultXY(isWide ? 'desktop' : 'mobile');
        if (setDefaultX)
            this.panelEl.style.left = `${x}px`;
        if (setDefaultY)
            this.panelEl.style.top = `${y}px`;
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
    render() {
        if (!this.panelEl || this.minimized)
            return;
        const tabsContainer = this.panelEl.querySelector('.outfit-tabs');
        if (!tabsContainer)
            return;
        const contentArea = this.panelEl.querySelector('.outfit-content');
        if (!contentArea)
            return;
        this.tabsRenderer.renderTabs(tabsContainer, contentArea);
    }
    saveAndRenderContent() {
        this.outfitManager.saveSettings();
        this.render();
    }
    makePanelDraggable() {
        if (!this.panelEl)
            return;
        const handle = this.panelEl.querySelector(".outfit-header");
        if (!handle)
            return;
        let offsetX = 0;
        let offsetY = 0;
        const start = (e) => {
            var _a;
            if (!this.panelEl)
                return;
            handle.setPointerCapture(e.pointerId);
            const rect = this.panelEl.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
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
                e.preventDefault(); // stops scrolling
            }
            this.panelEl.style.left = `${e.clientX - offsetX}px`;
            this.panelEl.style.top = `${e.clientY - offsetY}px`;
        };
        const stop = (e) => {
            if (handle.hasPointerCapture(e.pointerId)) {
                handle.releasePointerCapture(e.pointerId);
            }
            handle.removeEventListener("pointermove", move);
            handle.removeEventListener("pointerup", stop);
            handle.removeEventListener("pointercancel", stop);
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
        const div = document.createElement('div');
        div.classList.add('outfit-actions');
        const createSpan = () => document.createElement('span');
        const actions = createConfiguredElements(createSpan, (minimizeBtn) => {
            minimizeBtn.classList.add('minimize-button');
            minimizeBtn.textContent = '−';
            minimizeBtn.addEventListener('click', () => this.toggleMinimize());
        }, (refreshBtn) => {
            refreshBtn.classList.add('refresh-button');
            refreshBtn.textContent = '↻';
            refreshBtn.addEventListener('click', () => {
                this.reinitialize();
            });
        }, (closeBtn) => {
            closeBtn.classList.add('close-button');
            closeBtn.textContent = '×';
            closeBtn.addEventListener('click', () => {
                this.hide();
            });
        });
        for (const action of actions) {
            action.classList.add('outfit-action', 'no-highlight');
        }
        div.append(...actions);
        return div;
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
        this.minimized = !this.minimized;
        this.updateMinimizeState();
    }
    updateMinimizeState() {
        if (!this.panelEl)
            return;
        const minimizeBtn = this.panelEl.querySelector('.minimize-button');
        if (this.minimized) {
            this.panelEl.classList.add("minimized");
            minimizeBtn.textContent = '+';
            this.collapseHeader();
        }
        else {
            this.panelEl.classList.remove("minimized");
            minimizeBtn.textContent = '−';
            this.expandHeader();
            this.render();
        }
    }
    getPanelSettings() {
        return OutfitTracker.panelSettings(this.getPanelType());
    }
    getDefaultXY(mode) {
        return OutfitTracker.panelSettings(this.getPanelType()).getXY(mode);
    }
    autoOpen(x, y) {
        this.show(x === undefined, y === undefined);
        this.toggleMinimize();
        if (!this.panelEl)
            return;
        this.panelEl.style.left = `${x}px`;
        this.panelEl.style.top = `${y}px`;
    }
    show(setDefaultX = false, setDefaultY = false) {
        if (this.initializePanel()) {
            this.resetPanel(setDefaultX, setDefaultY);
        }
        if (this.panelEl) {
            this.panelEl.hidden = false;
        }
        this.isVisible = true;
        this.render();
    }
    hide() {
        if (this.panelEl) {
            this.panelEl.hidden = true;
        }
        this.isVisible = false;
        this.minimized = false;
    }
    toggle() {
        this.isVisible ? this.hide() : this.show();
    }
}
