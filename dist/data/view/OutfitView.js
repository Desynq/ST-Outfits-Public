import { getSlotPresetRegistry } from "../../api/internal/slot-preset.js";
import { UnresolvedOutfitSlot, OutfitSlotState } from "../model/OutfitSnapshots.js";
import { OutfitTracker } from "../tracker.js";
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
        return slotIds.map(id => this.resolveSlot(id));
    }
    getSlotIds() {
        return this.slots.map(s => s.id);
    }
    getSlotKinds() {
        return this.slotView.getKinds();
    }
    getSlotsFromKind(kind) {
        return this.slots.filter(s => s.kind === kind);
    }
    mapSlots(map, filter) {
        const out = {};
        for (const slot of this.slots) {
            if (filter && !filter(slot, this.slots))
                continue;
            out[slot.id] = map(slot);
        }
        return out;
    }
    getSlotValueMap(filter) {
        const out = {};
        for (const slot of this.slots) {
            if (filter && !filter(slot, this.slots))
                continue;
            out[slot.id] = slot.value;
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
     * @returns a readonly of the outfit slot or `undefined` if the outfit does not have the slot
     */
    getSlotById(slotId) {
        return this.slotView.getSlotById(slotId);
    }
    getIndexById(slotId) {
        return this.slotView.getIndex(slotId);
    }
    resolveSlot(slotId) {
        const slot = this.getSlotById(slotId);
        if (!slot)
            return new UnresolvedOutfitSlot(slotId);
        return new OutfitSlotState(this.resolveSyncedSlot(slot), OutfitTracker.viewGallery());
    }
    resolveSyncedSlot(slot) {
        if (!slot.synced)
            return slot;
        if (slot.activeImageTag === null)
            return slot;
        const preset = getSlotPresetRegistry().get(slot.activeImageTag);
        if (!preset)
            return slot;
        if (slot.value === preset.value)
            return slot; // already synced
        return {
            ...slot,
            value: preset.value
        };
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
