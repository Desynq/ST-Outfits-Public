import { OutfitSlot, SlotKind } from "../model/Outfit.js";
import { AddSlotResult, MoveSlotResult, RenameKindResult } from "./MutableSlotView.js";
import { OutfitView } from "./OutfitView.js";

export class MutableOutfitView extends OutfitView {

	public setValue(slotId: string, value: string): boolean {
		return this.slotView.setValue(slotId, value);
	}

	public toggleSlot(slotId: string): boolean {
		const slot = this.getSlotById(slotId);
		if (!slot) return false;

		this.slotView.setEnabled(slot.id, !slot.enabled);
		return true;
	}

	public shiftSlotByIndex(sourceIndex: number, targetIndex: number): MoveSlotResult {
		return this.slotView.moveIndex(sourceIndex, targetIndex);
	}

	public addSlot(id: string, kind: SlotKind): AddSlotResult {
		return this.slotView.addSlot(id, kind);
	}

	public deleteSlot(slotId: string): boolean {
		return this.slotView.deleteSlot(slotId);
	}



	public sortByKind(kindOrder?: readonly SlotKind[]): void {
		this.slotView.sortByKind(kindOrder);
	}

	public renameKind(kind: SlotKind, newKind: SlotKind): RenameKindResult {
		return this.slotView.renameKind(kind, newKind);
	}
}
