import { OutfitImageState } from "./OutfitImageState.js";
class ContextSlotBase {
    constructor(id) {
        this.id = id;
    }
}
export class ContextSlotState extends ContextSlotBase {
    constructor(raw, imageRegistry) {
        super(raw.id);
        this.raw = raw;
        this.resolved = true;
        const images = {};
        for (const [tag, image] of Object.entries(raw.images)) {
            const ref = imageRegistry.getImageRef(image.key);
            if (!ref) {
                console.error(`Missing blob for image key ${image.key}`);
                images[tag] = null;
                continue;
            }
            images[tag] = new OutfitImageState(tag, image, ref);
        }
        this.images = images;
    }
    get kind() {
        return this.raw.kind;
    }
    get enabled() {
        return this.raw.enabled;
    }
    get activeImageTag() {
        return this.raw.activeImageTag;
    }
    get equipped() {
        return this.raw.equipped;
    }
    get conditions() {
        return this.raw.conditions;
    }
    get synced() {
        return this.raw.synced;
    }
    isEnabled() {
        return this.enabled;
    }
    isDisabled() {
        return !this.enabled;
    }
    getActiveImageState() {
        if (this.activeImageTag === null)
            return null;
        return this.images[this.activeImageTag] ?? null;
    }
    isActiveImageBlobMissing() {
        if (this.activeImageTag === null)
            return false;
        const image = this.images[this.activeImageTag];
        return image === null;
    }
    getImageState(tag) {
        return this.images[tag];
    }
    hasImageState(tag) {
        return tag in this.images;
    }
    getImageStates() {
        return Object.values(this.images).filter(img => img !== null);
    }
    /**
     * @returns Whether the slot has an OutfitImage record keyed by the SlotPreset
     */
    hasPreset(preset) {
        return preset.key in this.images;
    }
}
export class UnresolvedOutfitSlot extends ContextSlotBase {
    constructor(id) {
        super(id);
        this.resolved = false;
    }
}
export class TextSlotState extends ContextSlotState {
    get type() {
        return this.raw.type;
    }
    isEmpty() {
        return this.value === 'None';
    }
    get value() {
        return this.raw.value;
    }
}
export class TraitSlotState extends ContextSlotState {
    get type() {
        return this.raw.type;
    }
    isEmpty() {
        return this.traits.length === 0;
    }
    get traits() {
        return this.raw.traits;
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
