import { setScroll } from "../util/element/scroll.js";
import { OutfitPanelContext } from "./base/OutfitPanelContext.js";
import { DisplaySlot } from "./slots/DisplaySlot.js";
import { SlotImageElementFactory } from "./slots/SlotImageController.js";
import { SlotRenderer } from "./slots/SlotRenderer.js";
export class SlotsRenderer extends OutfitPanelContext {
    constructor() {
        super(...arguments);
        this.scrollPositions = new Map();
    }
    renderSlots(kind, slots, contentArea) {
        // Always store current scroll before replacing
        if (this.currentKind !== undefined) {
            this.scrollPositions.set(this.currentKind, contentArea.scrollTop);
        }
        this.currentKind = kind;
        const displaySlots = this.buildDisplaySlots(slots);
        const imageFactory = new SlotImageElementFactory(this.panel, contentArea.getBoundingClientRect().width);
        const slotFactory = new SlotRenderer(this.panel, displaySlots, imageFactory);
        const fragment = document.createDocumentFragment();
        for (const display of displaySlots) {
            const el = slotFactory.createSlotElement(contentArea, display);
            fragment.append(el);
        }
        const addSlotBtn = this.createAddSlotButton(kind);
        fragment.append(addSlotBtn);
        contentArea.replaceChildren(fragment);
        setScroll(contentArea, this.scrollPositions.get(kind));
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
