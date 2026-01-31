import { OutfitSlot, SlotKind } from "./data/model/Outfit";

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

function slot(id: string, kind: SlotKind): OutfitSlot {
	return {
		id,
		value: 'None',
		kind,
		enabled: true
	};
}

export const DEFAULT_SLOTS = [
	...DEFAULT_CLOTHING_SLOTS.map(id => slot(id, 'clothing')),
	...DEFAULT_ACCESSORY_SLOTS.map(id => slot(id, 'accessory'))
];