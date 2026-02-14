import { SlotKind } from "../data/model/Outfit.js";
import { OutfitPanelContext } from "./base/OutfitPanelContext.js";
import { DisplaySlot } from "./slots/DisplaySlot.js";
import { SlotRenderer } from "./slots/SlotRenderer.js";

export class SlotsRenderer extends OutfitPanelContext {

	private currentDisplaySlots: DisplaySlot[] = [];

	public renderSlots(kind: SlotKind, slots: readonly string[], container: HTMLDivElement): void {
		const resolvedSlots = this.outfitView.resolve(slots);
		const displaySlots: DisplaySlot[] = [];

		let displayIndex = 1;
		for (const slot of resolvedSlots) {
			if (!slot.resolved) {
				console.warn(`Slot ${slot.id} failed to resolve`);
				continue;
			}

			const slotIndex = this.outfitView.getIndexById(slot.id)!;

			const displaySlot = new DisplaySlot(displayIndex, slotIndex, slot);
			displaySlots.push(displaySlot);

			displayIndex++;
		}

		this.currentDisplaySlots = displaySlots;

		const comp = new SlotRenderer(this.panel, () => this.currentDisplaySlots);
		for (const displaySlot of displaySlots) {
			comp.render(container, displaySlot);
		}

		this.renderAddSlotButton(container, kind);
	}

	private renderAddSlotButton(container: HTMLDivElement, kind: SlotKind): void {
		const addSlotButton = document.createElement('button');
		addSlotButton.className = 'add-slot-button';
		addSlotButton.textContent = 'Add Slot';

		addSlotButton.addEventListener('click', () => this.addSlot(container, kind));
		container.appendChild(addSlotButton);
	}

	private addSlot(container: HTMLDivElement, kind: SlotKind): void {
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