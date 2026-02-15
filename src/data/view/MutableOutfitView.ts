import { SlotKind } from "../model/Outfit.js";
import { AddSlotResult, AttachImageResult, DeleteImageResponse, MoveSlotResult, MoveToKindResult, RenameKindResult, ResizeImageResult, SetActiveImageResult, ToggleImageResult } from "./MutableSlotView.js";
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

	public moveToKind(id: string, kind: SlotKind): MoveToKindResult {
		return this.slotView.moveToKind(id, kind);
	}



	public attachImage(id: string, tag: string, blobKey: string): AttachImageResult {
		return this.slotView.attachImage(id, tag, blobKey);
	}

	public deleteImage(id: string, tag: string): DeleteImageResponse {
		return this.slotView.deleteImage(id, tag);
	}

	public setActiveImage(id: string, tag: string): SetActiveImageResult {
		return this.slotView.setActiveImage(id, tag);
	}

	public toggleImage(id: string, tag: string, hidden: boolean): ToggleImageResult {
		return this.slotView.toggleImage(id, tag, hidden);
	}

	public resizeImage(id: string, tag: string, width: number, height: number): ResizeImageResult {
		return this.slotView.resizeImage(id, tag, width, height);
	}
}
