import { OutfitPanelContext } from "./base/OutfitPanelContext.js";
import { DisplaySlot } from "./slots/DisplaySlot.js";
import { SlotImageElementFactory } from "./slots/SlotImageController.js";
import { SlotRenderer } from "./slots/SlotRenderer.js";
export class SlotsRenderer extends OutfitPanelContext {
    constructor() {
        super(...arguments);
        this.rendered = new Map();
    }
    renderSlots(kind, slots, contentArea) {
        if (this.currentKind !== kind) {
            this.rendered.clear();
            contentArea.innerHTML = '';
            this.currentKind = kind;
        }
        const displaySlots = this.buildDisplaySlots(slots);
        const desiredIds = new Set(displaySlots.map(ds => ds.slot.id));
        // Remove slots that no longer exist
        for (const [id, el] of this.rendered) {
            if (!desiredIds.has(id)) {
                el.remove();
                this.rendered.delete(id);
            }
        }
        const imageFactory = new SlotImageElementFactory(this.panel, contentArea.getBoundingClientRect().width);
        const slotFactory = new SlotRenderer(this.panel, displaySlots, imageFactory);
        for (let i = 0; i < displaySlots.length; i++) {
            const display = displaySlots[i];
            const existing = this.rendered.get(display.slot.id);
            const fresh = slotFactory.createSlotElement(contentArea, display);
            if (existing) {
                existing.replaceWith(fresh);
            }
            this.rendered.set(display.slot.id, fresh);
            const currentChild = contentArea.children[i];
            if (currentChild !== fresh) {
                contentArea.insertBefore(fresh, currentChild ?? null);
            }
        }
        this.addSlotBtn?.remove();
        this.addSlotBtn = this.createAddSlotButton(kind);
        contentArea.append(this.addSlotBtn);
    }
    buildDisplaySlots(slots) {
        const resolvedSlots = this.outfitView.resolve(slots);
        const displaySlots = [];
        let displayIndex = 1;
        for (const slot of resolvedSlots) {
            if (!slot.resolved) {
                console.warn(`Slot ${slot.id} failed to resolve`);
                continue;
            }
            const slotIndex = this.outfitView.getIndexById(slot.id);
            const displaySlot = new DisplaySlot(displayIndex, slotIndex, slot);
            displaySlots.push(displaySlot);
            displayIndex++;
        }
        return displaySlots;
    }
    createAddSlotButton(kind) {
        const addSlotButton = document.createElement('button');
        addSlotButton.className = 'add-slot-button';
        addSlotButton.textContent = 'Add Slot';
        addSlotButton.addEventListener('click', () => this.addSlot(kind));
        return addSlotButton;
    }
    addSlot(kind) {
        const id = prompt('Name?')?.trim();
        if (!id) {
            this.panel.render();
            return;
        }
        const duplicate = !this.outfitView.addSlot(id, kind);
        if (duplicate) {
            this.panel.sendSystemMessage(`Slot with id ${id} already exists.`);
            return;
        }
        this.outfitManager.updateOutfitValue(id);
        this.panel.saveAndRender();
    }
}
