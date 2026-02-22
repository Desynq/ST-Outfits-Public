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
    setEquipped(slotId, equipped) {
        return this.slotView.setEquipped(slotId, equipped);
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
    attachImage(id, tag, blobKey) {
        return this.slotView.attachImage(id, tag, blobKey);
    }
    deleteImage(id, tag) {
        return this.slotView.deleteImage(id, tag);
    }
    setActiveImage(id, tag) {
        return this.slotView.setActiveImage(id, tag);
    }
    toggleImage(id, tag, hidden) {
        return this.slotView.toggleImage(id, tag, hidden);
    }
    resizeImage(id, tag, width, height) {
        return this.slotView.resizeImage(id, tag, width, height);
    }
}
