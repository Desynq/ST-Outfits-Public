import { UnresolvedOutfitSlot, ResolvedOutfitSlot } from "../model/OutfitSnapshots.js";
import { MutableSlotView } from "./MutableSlotView.js";
export class OutfitView {
    constructor(outfitName, outfit) {
        this.outfitName = outfitName;
        this.slotView = new MutableSlotView(outfit.slots);
    }
    get slots() {
        return this.slotView.slots;
    }
    get values() {
        return Object.fromEntries(this.slots
            .map(s => [s.id, s.value]));
    }
    /**
     * @deprecated
     */
    resolve(slotIds) {
        return slotIds.map(id => this.getResolvedSlot(id));
    }
    getSlotIds() {
        return this.slots.map(s => s.id);
    }
    getSlotKinds() {
        return this.slotView.getKinds();
    }
    getClothingSlotIds() {
        return this.slots.filter(s => s.kind === 'clothing').map(s => s.id);
    }
    getAccessorySlotIds() {
        return this.slots.filter(s => s.kind === 'accessory').map(s => s.id);
    }
    getSlotRecords(filter) {
        const out = {};
        for (const s of this.slots) {
            if (filter && !filter(s))
                continue;
            out[s.id] = s.value;
        }
        return out;
    }
    hasSlotId(slotId) {
        return this.slots.some(s => s.id === slotId);
    }
    hasSlot(slot) {
        return this.hasSlotId(slot.id);
    }
    isEmpty() {
        return this.slots.length === 0;
    }
    /**
     * @returns a shallow copy of the outfit slot or `undefined` if the outfit does not have the slot
     */
    getSlotById(slotId) {
        return this.slotView.getSlotById(slotId);
    }
    getIndexById(slotId) {
        return this.slotView.getIndex(slotId);
    }
    /**
     * @deprecated
     */
    getResolvedSlot(slotId) {
        const slot = this.getSlotById(slotId);
        return !slot
            ? new UnresolvedOutfitSlot(slotId)
            : ResolvedOutfitSlot.fromSlot(slot, slot.value);
    }
    getValue(slot) {
        const realSlot = this.slotView.getSlotById(slot.id);
        if (!realSlot) {
            throw new Error(`Slot ${slot.id} does not belong to outfit ${this.outfitName}`);
        }
        return realSlot.value;
    }
    snapshot() {
        return {
            slots: this.slots.map(s => ({ ...s })),
            values: { ...this.values }
        };
    }
}
