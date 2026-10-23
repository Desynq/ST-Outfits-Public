import { OutfitSlot, SlotKind } from "./data/model/Outfit.js";

export const DEFAULT_CLOTHING_SLOTS = [
	'headwear',
	'topwear',
	'top-underwear',
	'bottomwear',
	'bottom-underwear',
	'footwear',
	'foot-underwear',
	'outfit',
	'outfit-underwear'
] as const;

export const DEFAULT_ACCESSORY_SLOTS = [
	'head-accessory',
	'ears-accessory',
	'eyes-accessory',
	'mouth-accessory',
	'neck-accessory',
	'body-accessory',
	'arms-accessory',
	'hands-accessory',
	'waist-accessory',
	'bottom-accessory',
	'legs-accessory',
	'foot-accessory'
] as const;

export function toSlot(from: {
	id: string;
	kind: SlotKind;
	value?: string;
}): OutfitSlot {
	return {
		id: from.id,
		value: from.value ?? 'None',
		kind: from.kind,
		enabled: true,
		images: {},
		activeImageTag: null,
		equipped: true,
		conditions: {
			mode: 'none',
			items: []
		},
		synced: false
	};
}

export const DEFAULT_SLOTS = [
	...DEFAULT_CLOTHING_SLOTS.map(id => toSlot({ id, kind: 'clothing' })),
	...DEFAULT_ACCESSORY_SLOTS.map(id => toSlot({ id, kind: 'accessory' }))
];




export interface CharacterNoteConfig {
	icon: string;
	add_button_text: string;
	context_label: string;
}

export const CHARACTER_NOTE_OPTIONS = {
	character: {
		icon: 'fa-solid fa-address-book',
		add_button_text: '👤   Note',
		context_label: 'Character context'
	},
	clothing: {
		icon: 'fa-regular fa-shirt',
		add_button_text: '👤🧥 Note',
		context_label: 'Clothing context'
	},
	nsfw: {
		icon: 'fa-solid fa-fire',
		add_button_text: '👤🔥 Note',
		context_label: 'NSFW context'
	},
	dialogue: {
		icon: 'fa-solid fa-microphone-lines',
		add_button_text: '👤🎙️ Note',
		context_label: 'Dialogue examples'
	}
} as const satisfies Record<string, CharacterNoteConfig>;

export type CharacterNoteType = keyof typeof CHARACTER_NOTE_OPTIONS;

export const CHARACTER_NOTE_TYPES =
	Object.keys(CHARACTER_NOTE_OPTIONS) as CharacterNoteType[];