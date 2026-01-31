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
	hideDisabled: boolean;
	hideEmpty: boolean;
}

export type CharactersOutfitMap = Record<string, OutfitCollection | undefined>;

export interface GlobalOutfitMap {
	bot: CharactersOutfitMap; // each character has their own OutfitCollection
	user: OutfitCollection; // there is only one OutfitCollection for the user
}

export type XY = readonly [number, number];

export interface PanelSettings {
	desktopXY: XY;
	mobileXY: XY;
	saveXY: boolean;
}

export interface OutfitTrackerModel {
	presets: GlobalOutfitMap;
	enableSysMessages: boolean;
	botPanel: PanelSettings;
	userPanel: PanelSettings;
}

export interface ExtensionSettingsAugment {
	outfit_tracker?: OutfitTrackerModel;
}
