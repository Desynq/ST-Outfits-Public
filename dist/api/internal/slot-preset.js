import { OutfitTracker } from "../../data/tracker.js";
import { resolveKebabCase } from "../../util/StringHelper.js";
export function getSlotPresetRegistry() {
    return OutfitTracker.slotPresets();
}
export function canHavePreset(slot) {
    return slot.getActiveImageState() !== null;
}
export function canSync(slot) {
    return slot.synced && canHavePreset(slot);
}
export function promptPresetKey() {
    const raw = prompt('Enter image tag (kebab-case only)');
    if (!raw)
        return null;
    return resolveKebabCase(raw);
}
export function confirmPresetOverwrite(step, key) {
    if (step.oldPreset || step.alreadyOnSlot) {
        const ok = confirm(`Preset "${key}" exists. Overwrite?`);
        if (!ok) {
            return false;
        }
    }
    return true;
}
export function beginSaveSlotAsPreset({ slot, registry = getSlotPresetRegistry(), key }) {
    const imageState = slot.getActiveImageState();
    if (!imageState) {
        return { type: 'no-image' };
    }
    const preset = buildPresetFromImage({
        slot,
        key,
        image: imageState.image
    });
    return {
        type: 'ready',
        oldPreset: registry.get(key),
        alreadyOnSlot: slot.hasPreset(preset),
        save: () => {
            registry.set(preset);
            return preset;
        }
    };
}
export function beginSaveSlotAsPresetFromImageTag({ slot, registry = getSlotPresetRegistry() }) {
    const imageState = slot.getActiveImageState();
    if (!imageState) {
        return { type: 'no-image' };
    }
    const preset = buildPresetFromImage({
        slot,
        key: imageState.tag,
        image: imageState.image
    });
    return {
        type: 'ready',
        oldPreset: registry.get(imageState.tag),
        alreadyOnSlot: slot.hasPreset(preset),
        save: () => {
            registry.set(preset);
            return preset;
        }
    };
}
function buildPresetFromImage({ slot, key, image }) {
    const { key: imageKey, width: imageWidth, height: imageHeight } = image;
    return {
        key,
        value: slot.value,
        imageKey,
        imageWidth,
        imageHeight,
        createdAt: Date.now(),
        lastUsedAt: Date.now()
    };
}
