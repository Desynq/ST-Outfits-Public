import { OutfitTracker } from "../../data/tracker.js";
import { resolveKebabCase } from "../../util/StringHelper.js";
export function getSlotPresetRegistry() {
    return OutfitTracker.slotPresets();
}
export function hasImage(preset) {
    return preset.image !== undefined;
}
export function canSync(slot) {
    return slot.synced;
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
    const preset = buildPresetFromSlot(slot);
    return {
        type: 'ready',
        oldPreset: registry.get(key),
        preset,
        alreadyOnSlot: slot.hasPreset(preset),
        save: () => {
            registry.set(preset);
            return preset;
        }
    };
}
/**
 * Saves the slot as a preset using the active image's tag if present or the slot's id for the slot preset key
 */
export function beginSaveSlotAsPresetAuto({ slot, registry = getSlotPresetRegistry() }) {
    const imageState = slot.getActiveImageState();
    const preset = buildPresetFromSlot(slot);
    return {
        type: 'ready',
        oldPreset: registry.get(imageState ? imageState.tag : slot.id),
        preset,
        alreadyOnSlot: slot.hasPreset(preset),
        save: () => {
            registry.set(preset);
            return preset;
        }
    };
}
function buildPresetFromSlot(slot) {
    const imageState = slot.getActiveImageState();
    const preset = {
        key: imageState ? imageState.tag : slot.id,
        value: slot.value,
        createdAt: Date.now(),
        lastUsedAt: Date.now()
    };
    if (imageState) {
        const image = imageState.image;
        preset.image = {
            key: image.key,
            width: image.width,
            height: image.height
        };
    }
    return preset;
}
function buildPresetFromImage({ slot, key, image }) {
    const preset = {
        key,
        value: slot.value,
        createdAt: Date.now(),
        lastUsedAt: Date.now()
    };
    if (image) {
        preset.image = {
            key: image.key,
            width: image.width,
            height: image.height
        };
    }
    return preset;
}
