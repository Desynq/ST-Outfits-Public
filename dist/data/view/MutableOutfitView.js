import { OutfitView } from "./OutfitView.js";
export class MutableOutfitView extends OutfitView {
    setValue(slotId, value) {
        return this.slotView.setValue(slotId, value);
    }
    toggleSlot(slotId) {
        const slot = this.getSlotById(slotId);
        if (!slot)
            return false;
        this.slotView.setEnabled(slot.id, !slot.enabled);
        return true;
    }
    shiftSlotByIndex(sourceIndex, targetIndex) {
        return this.slotView.moveIndex(sourceIndex, targetIndex);
    }
    addSlot(id, kind) {
        return this.slotView.addSlot(id, kind);
    }
    deleteSlot(slotId) {
        return this.slotView.deleteSlot(slotId);
    }
    sortByKind(kindOrder) {
        this.slotView.sortByKind(kindOrder);
    }
    renameKind(kind, newKind) {
        return this.slotView.renameKind(kind, newKind);
    }
    moveToKind(id, kind) {
        return this.slotView.moveToKind(id, kind);
    }
}
