import { OutfitTracker } from "../outfit/tracker.js";
import { createConfiguredElements } from "../util/ElementHelper.js";
import { SlotsRenderer } from "./SlotsRenderer.js";
import { OutfitTabsRenderer as TabsRenderer } from "./TabsRenderer.js";
export class OutfitPanel {
    constructor(outfitManager) {
        this.outfitManager = outfitManager;
        this.domElement = null;
        this.minimized = false;
        this.hideDisabled = false;
        this.hideEmpty = false;
        this.isVisible = false;
        this.slotsRenderer = new SlotsRenderer(this);
        this.tabsRenderer = new TabsRenderer(this);
    }
    isMinimized() {
        return this.minimized;
    }
    areDisabledSlotsHidden() {
        return this.hideDisabled;
    }
    areEmptySlotsHidden() {
        return this.hideEmpty;
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
    renderContent() {
        if (!this.domElement || this.minimized)
            return;
        const tabsContainer = this.domElement.querySelector('.outfit-tabs');
        if (!tabsContainer)
            return;
        const contentArea = this.domElement.querySelector('.outfit-content');
        if (!contentArea)
            return;
        this.tabsRenderer.renderTabs(tabsContainer, contentArea);
    }
    saveAndRenderContent() {
        this.outfitManager.saveSettings();
        this.renderContent();
    }
    makePanelDraggable() {
        if (!this.domElement)
            return;
        const handle = this.domElement.querySelector(".outfit-header");
        if (!handle)
            return;
        let offsetX = 0;
        let offsetY = 0;
        const start = (e) => {
            var _a;
            if (!this.domElement)
                return;
            handle.setPointerCapture(e.pointerId);
            const rect = this.domElement.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            (_a = this.domElement.style).position || (_a.position = 'absolute');
            this.domElement.style.right = "auto";
            this.domElement.style.left = rect.left + "px";
            this.domElement.style.top = rect.top + "px";
            handle.addEventListener("pointermove", move);
            handle.addEventListener("pointerup", stop);
            handle.addEventListener("pointercancel", stop);
        };
        const move = (e) => {
            if (!this.domElement)
                return;
            if (e.pointerType === 'touch') {
                e.preventDefault(); // stops scrolling
            }
            this.domElement.style.left = `${e.clientX - offsetX}px`;
            this.domElement.style.top = `${e.clientY - offsetY}px`;
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
        const handle = this.domElement?.querySelector(".outfit-header");
        if (!handle)
            return;
        // Simulate a pointerdown on the handle
        // So your existing dragging logic activates correctly
        handle.dispatchEvent(new PointerEvent("pointerdown", e));
    }
    makeHeaderMinimizable() {
        if (!this.domElement)
            return;
        const title = this.domElement.querySelector(".outfit-header h3");
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
    toggleHideDisabled() {
        this.hideDisabled = !this.hideDisabled;
        this.renderContent();
    }
    toggleHideEmpty() {
        this.hideEmpty = !this.hideEmpty;
        this.renderContent();
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
                this.outfitManager.initializeOutfit();
                this.renderContent();
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
        if (!this.domElement)
            return;
        const titleElement = this.domElement.querySelector(".outfit-header h3");
        if (titleElement)
            titleElement.textContent = this.getHeaderTitle();
    }
    collapseHeader() {
        if (!this.domElement)
            return;
        const titleEl = this.domElement.querySelector('.outfit-header h3');
        if (titleEl)
            titleEl.textContent = "";
    }
    toggleMinimize() {
        this.minimized = !this.minimized;
        this.updateMinimizeState();
    }
    updateMinimizeState() {
        if (!this.domElement)
            return;
        const minimizeBtn = this.domElement.querySelector('.minimize-button');
        if (this.minimized) {
            this.domElement.classList.add("minimized");
            minimizeBtn.textContent = '+';
            this.collapseHeader();
        }
        else {
            this.domElement.classList.remove("minimized");
            minimizeBtn.textContent = '−';
            this.expandHeader();
            this.renderContent();
        }
    }
    autoOpen(x, y) {
        this.show();
        this.toggleMinimize();
        if (!this.domElement)
            return;
        this.domElement.style.left = `${x}px`;
        this.domElement.style.top = `${y}px`;
        this.domElement.style.right = "auto"; // ensure right doesn't override left positioning
    }
    show() {
        this.initializePanel();
        this.renderContent();
        this.domElement.style.display = 'flex';
        this.isVisible = true;
    }
    hide() {
        if (this.domElement) {
            this.domElement.style.display = 'none';
        }
        this.isVisible = false;
        this.minimized = false;
    }
    toggle() {
        this.isVisible ? this.hide() : this.show();
    }
}
