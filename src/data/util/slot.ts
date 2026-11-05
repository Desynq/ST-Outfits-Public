import { assertNever } from "../../shared.js";
import type { ContextSlot, ContextSlotBase, SlotKind, TraitDefinition } from "../model/Outfit.js";
import type { ImageRegistry } from "../model/OutfitGallery.js";
import { TextSlotState, TraitSlotState, UnresolvedOutfitSlot } from "../model/OutfitSnapshots.js";

export function createSlot({
	id,
	kind,
	type
}: {
	id: string;
	kind: SlotKind;
	type: ContextSlot['type'];
}): ContextSlot {
	const base = {
		id,
		kind,
		enabled: true,
		images: {},
		activeImageTag: null,
		equipped: false,
		conditions: {
			mode: 'none',
			items: []
		},
		synced: false
	} satisfies ContextSlotBase;

	switch (type) {
		case 'text':
			return {
				...base,
				type,
				value: ''
			};

		case 'traits':
			return {
				...base,
				type,
				traits: []
			};
		default:
			return assertNever(type);
	}
}



export function createSlotState(
	slot: Readonly<ContextSlot>,
	imageRegistry: ImageRegistry
): ResolvedSlotState {
	switch (slot.type) {
		case 'text':
			return new TextSlotState(slot, imageRegistry);

		case 'traits':
			return new TraitSlotState(slot, imageRegistry);
	}
}

export type ResolvedSlotState =
	| TextSlotState
	| TraitSlotState;

export type ContextSlotView =
	| ResolvedSlotState
	| UnresolvedOutfitSlot;




export function contextualizeSlot(
	slot: Readonly<ContextSlot>,
	traits: Readonly<Record<string, TraitDefinition>>
): string {
	switch (slot.type) {
		case 'text':
			return slot.value;

		case 'traits':
			return slot.traits
				.map(({ traitId, addendum }) => {
					const trait = traits[traitId];
					if (!trait) return null;

					const description = trait.description.trim();
					const manifestation = addendum?.trim();

					return [
						`- ${trait.id}: ${description}`,
						manifestation
							? `  - Manifestation: ${manifestation}`
							: null
					].filter(Boolean).join('\n');
				})
				.filter((value): value is string => value !== null)
				.join('\n');
	}
}