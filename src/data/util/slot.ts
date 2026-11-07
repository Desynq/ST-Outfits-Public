import { assertNever } from "../../shared.js";
import type { ContextSlot, ContextSlotBase, SlotKind, TraitDefinition } from "../model/Outfit.js";
import type { ImageRegistry } from "../model/OutfitGallery.js";
import { TextSlotState, TraitSlotState, UnresolvedOutfitSlot } from "../model/OutfitSnapshots.js";
import { TraitRegistryView } from "../view/TraitRegistryView.js";

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
		equipped: true,
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
				.filter(({ traitId }) => traits[traitId])
				.map(({ traitId, addendum }) => {
					const name = TraitRegistryView.toDisplayName(traitId);
					const manifestation = addendum?.trim();

					return `- ${name}${manifestation ? `: ${manifestation}` : ''}`;
				})
				.join('\n');
	}
}