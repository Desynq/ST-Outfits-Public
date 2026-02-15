class OutfitSlotBase {
    constructor(id) {
        this.id = id;
    }
}
export class ResolvedOutfitSlot extends OutfitSlotBase {
    constructor(id, kind, value, enabled, images, activeImageTag) {
        super(id);
        this.kind = kind;
        this.value = value;
        this.enabled = enabled;
        this.images = images;
        this.activeImageTag = activeImageTag;
        this.resolved = true;
    }
    static fromSlot(slot, value) {
        return new ResolvedOutfitSlot(slot.id, slot.kind, value, slot.enabled, slot.images, slot.activeImageTag);
    }
    isEnabled() {
        return this.enabled;
    }
    isDisabled() {
        return !this.enabled;
    }
    isEmpty() {
        return this.value === 'None';
    }
}
export class UnresolvedOutfitSlot extends OutfitSlotBase {
    constructor(id) {
        super(id);
        this.resolved = false;
    }
}
export function areOutfitSnapshotsEqual(a, b) {
    // compare slots (id + kind + order)
    if (a.slots.length !== b.slots.length)
        return false;
    for (let i = 0; i < a.slots.length; i++) {
        const sa = a.slots[i];
        const sb = b.slots[i];
        if (sa.id !== sb.id || sa.kind !== sb.kind)
            return false;
    }
    // compare values
    const aKeys = Object.keys(a.values);
    const bKeys = Object.keys(b.values);
    if (aKeys.length !== bKeys.length)
        return false;
    for (const key of aKeys) {
        if (a.values[key] !== b.values[key])
            return false;
    }
    return true;
}
