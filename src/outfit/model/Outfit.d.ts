export type KnownSlotKind =
	| 'clothing'
	| 'accessory';

export type SlotKind = KnownSlotKind | (string & {});

export interface OutfitSlot {
	id: string;
	value: string;
	kind: SlotKind;
	enabled: boolean;
}

export interface Outfit {
	slots: OutfitSlot[];
}

export interface OutfitCollection {
	outfits: Record<string, Outfit | undefined>;
	autoOutfit: Outfit;
}

export type CharacterOutfitMap = Record<string, OutfitCollection | undefined>;

export interface GlobalOutfitMap {
	bot: CharacterOutfitMap;
	user: OutfitCollection;
}

export interface OutfitTrackerModel {
	presets: GlobalOutfitMap;
	enableSysMessages: boolean;
}

export interface ExtensionSettingsAugment {
	outfit_tracker?: OutfitTrackerModel;
}
