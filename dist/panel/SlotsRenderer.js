import { OutfitPanelContext } from "./base/OutfitPanelContext.js";
import { DisplaySlot } from "./slots/DisplaySlot.js";
import { SlotImageElementFactory } from "./slots/SlotImageController.js";
import { SlotRenderer } from "./slots/SlotRenderer.js";
export class SlotsRenderer extends OutfitPanelContext {
    constructor() {
        super(...arguments);
        this.currentDisplaySlots = [];
    }
    renderSlots(kind, slots, container) {
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
        this.currentDisplaySlots = displaySlots;
        const imageElementFactory = new SlotImageElementFactory(this.panel, container.getBoundingClientRect().width);
        const slotElement = new SlotRenderer(this.panel, () => this.currentDisplaySlots, imageElementFactory);
        for (const displaySlot of displaySlots) {
            slotElement.render(container, displaySlot);
        }
        this.renderAddSlotButton(container, kind);
    }
    renderAddSlotButton(container, kind) {
        const addSlotButton = document.createElement('button');
        addSlotButton.className = 'add-slot-button';
        addSlotButton.textContent = 'Add Slot';
        addSlotButton.addEventListener('click', () => this.addSlot(container, kind));
        container.appendChild(addSlotButton);
    }
    addSlot(container, kind) {
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
