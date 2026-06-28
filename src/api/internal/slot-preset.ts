import { OutfitImage } from "../../data/model/Outfit.js";
import { OutfitImageState } from "../../data/model/OutfitImageState.js";
import { OutfitSlotState } from "../../data/model/OutfitSnapshots.js";
import { KeyedSlotPreset, KeyedSlotPresetWithImage, SlotPreset } from "../../data/model/SlotPreset.js";
import { OutfitTracker } from "../../data/tracker.js";
import { SlotPresetRegistry } from "../../data/view/SlotPresetsView.js";
import { deleteUndefined } from "../../util/object-helper.js";
import { resolveKebabCase } from "../../util/StringHelper.js";



export function getSlotPresetRegistry(): SlotPresetRegistry {
	return OutfitTracker.slotPresets();
}


export function hasImage(
	preset: KeyedSlotPreset
): preset is KeyedSlotPresetWithImage {
	return preset.image !== undefined;
}



type SlotPresetSource = {
	value: string;
	id: string;
	getActiveImageState: () => OutfitImageState | null;
	hasPreset: (preset: KeyedSlotPreset) => boolean;
};


export function canHavePreset(slot: OutfitSlotState): boolean {
	return slot.getActiveImageState() !== null;
}

export function canSync(slot: OutfitSlotState): boolean {
	return slot.synced && canHavePreset(slot);
}


export function promptPresetKey(): string | null {
	const raw = prompt('Enter image tag (kebab-case only)');
	if (!raw) return null;

	return resolveKebabCase(raw);
}



type SaveSlotStep =
	| {
		type: 'ready';
		oldPreset: KeyedSlotPreset | undefined;
		alreadyOnSlot: boolean;
		save: () => KeyedSlotPreset;
	};

export function confirmPresetOverwrite(step: Extract<SaveSlotStep, { type: 'ready'; }>, key: string): boolean {
	if (step.oldPreset || step.alreadyOnSlot) {
		const ok = confirm(`Preset "${key}" exists. Overwrite?`);
		if (!ok) {
			return false;
		}
	}

	return true;
}

export function beginSaveSlotAsPreset({ slot, registry = getSlotPresetRegistry(), key }: {
	slot: SlotPresetSource;
	registry?: SlotPresetRegistry;
	key: string;
}): SaveSlotStep {
	const preset = buildPresetFromSlot(slot);

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


/**
 * Saves the slot as a preset using the active image's tag if present or the slot's id for the slot preset key
 */
export function beginSaveSlotAsPresetAuto({ slot, registry = getSlotPresetRegistry() }: {
	slot: SlotPresetSource;
	registry?: SlotPresetRegistry;
}): SaveSlotStep {
	const imageState = slot.getActiveImageState();

	const preset = buildPresetFromSlot(slot);

	return {
		type: 'ready',
		oldPreset: registry.get(imageState ? imageState.tag : slot.id),
		alreadyOnSlot: slot.hasPreset(preset),
		save: () => {
			registry.set(preset);
			return preset;
		}
	};
}

function buildPresetFromSlot(slot: SlotPresetSource): KeyedSlotPreset {
	const imageState = slot.getActiveImageState();

	const preset: KeyedSlotPreset = {
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

function buildPresetFromImage({ slot, key, image }: {
	slot: SlotPresetSource;
	key: string;
	image?: OutfitImage;
}): KeyedSlotPreset {
	const preset: KeyedSlotPreset = {
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