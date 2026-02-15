export type KnownSlotKind =
	| 'clothing'
	| 'accessory';

export type SlotKind = KnownSlotKind | (string & {});

export interface OutfitImage {
	key: string;
	width: number; // current rendered size
	height: number;
	hidden: boolean;
}

export interface OutfitSlot {
	id: string;
	value: string;
	kind: SlotKind;
	enabled: boolean;
	images: Record<string, OutfitImage>;
	activeImageTag: string | null;
}

export interface Outfit {
	slots: OutfitSlot[];
}

export interface OutfitCollection {
	outfits: Record<string, Outfit | undefined>;
	autoOutfit: Outfit;
	hideDisabled: boolean;
	hideEmpty: boolean;
	snapshots: Record<string, OutfitCachedSnapshot>;
	diffs: Record<string, OutfitCachedDiff>;
	// TODO: move snapshots and diffs to here
}

export type CharactersOutfitMap = Record<string, OutfitCollection | undefined>;

export interface OutfitPresetsTree {
	bot: CharactersOutfitMap; // each character has their own OutfitCollection
	user: OutfitCollection; // there is only one OutfitCollection for the user
}

export type XY = readonly [number, number];

export interface PanelSettings {
	desktopXY: XY;
	mobileXY: XY;
	saveXY: boolean;
}



export interface OutfitCachedSnapshot {
	namespace: string;
	slots: Record<string, string>;
	createdAt: number;
}

export interface OutfitCachedDiff {
	namespace: string;
	added: Record<string, string>;
	removed: string[];
	changed: Record<string, { from: string, to: string; }>;
	createdAt: number;
}

export interface ImageBlob {
	base64: string;
	height: number; // intrinsic dimensions
	width: number;
}

export interface OutfitTrackerModel {
	presets: OutfitPresetsTree;
	enableSysMessages: boolean;
	botPanel: PanelSettings;
	userPanel: PanelSettings;
	// key: base64
	images: Record<string, ImageBlob>;
}

export interface ExtensionSettingsAugment {
	outfit_tracker?: OutfitTrackerModel;
}
