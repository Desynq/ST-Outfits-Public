import { OutfitImage } from "../../data/model/Outfit.js";
import { OutfitImageState } from "../../data/model/OutfitImageState.js";
import { OutfitSlotState } from "../../data/model/OutfitSnapshots.js";
import { KeyedSlotPreset } from "../../data/model/SlotPreset.js";
import { OutfitTracker } from "../../data/tracker.js";
import { SlotPresetRegistry } from "../../data/view/SlotPresetsView.js";
import { resolveKebabCase } from "../../util/StringHelper.js";



export function getSlotPresetRegistry(): SlotPresetRegistry {
	return OutfitTracker.slotPresets();
}

type SlotPresetSource = {
	value: string;
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
	| { type: 'no-image'; }
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



export function beginSaveSlotAsPresetFromImageTag({ slot, registry = getSlotPresetRegistry() }: {
	slot: SlotPresetSource;
	registry?: SlotPresetRegistry;
}): SaveSlotStep {
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

function buildPresetFromImage({ slot, key, image }: {
	slot: SlotPresetSource;
	key: string;
	image: OutfitImage;
}): KeyedSlotPreset {
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