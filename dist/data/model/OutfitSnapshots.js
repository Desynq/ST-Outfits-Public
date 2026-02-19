import { OutfitImageState } from "./OutfitImageState.js";
class OutfitSlotBase {
    constructor(id) {
        this.id = id;
    }
}
export class OutfitSlotState extends OutfitSlotBase {
    constructor(id, kind, value, enabled, 
    // tag: OutfitImageState
    images, activeImageTag) {
        super(id);
        this.kind = kind;
        this.value = value;
        this.enabled = enabled;
        this.images = images;
        this.activeImageTag = activeImageTag;
        this.resolved = true;
    }
    static fromSlot(slot, imageRegistry) {
        const resolvedImages = {};
        for (const [tag, image] of Object.entries(slot.images)) {
            const blob = imageRegistry.getImage(image.key);
            if (!blob) {
                throw new Error(`Missing blob for image key ${image.key}`);
            }
            resolvedImages[tag] = new OutfitImageState(tag, image, blob);
        }
        if (slot.activeImageTag !== null && !resolvedImages[slot.activeImageTag]) {
            throw new Error(`Missing image for active image tag`);
        }
        return new OutfitSlotState(slot.id, slot.kind, slot.value, slot.enabled, resolvedImages, slot.activeImageTag);
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
    getActiveImageState() {
        if (this.activeImageTag === null)
            return null;
        return this.images[this.activeImageTag];
    }
    getImageState(tag) {
        return this.images[tag];
    }
    hasImageState(tag) {
        return tag in this.images;
    }
    getImageStates() {
        return Object.values(this.images);
    }
    /**
     * @returns Whether the slot has an OutfitImage record keyed by the SlotPreset
     */
    hasPreset(preset) {
        return preset.key in this.images;
    }
    isPreset(preset) {
        const image = this.images[preset.key];
        if (!image)
            return false;
        if (image.image.width !== preset.imageWidth)
            return false;
        if (image.image.height !== preset.imageHeight)
            return false;
        if (this.value !== preset.value)
            return false;
        return true;
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
