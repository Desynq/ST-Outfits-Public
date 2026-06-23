import { PartialPanelSettings } from "../view/PartialPanelSettings";
import { CharPanelsTree, PanelSettings } from "./Panels";
import { SlotPreset } from "./SlotPreset";

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

export interface SlotCondition {
	type: 'active';
	id: string;
}

export type SlotConditionMapMode = 'none' | 'and_all';

export interface SlotConditionMap {
	mode: SlotConditionMapMode;
	items: SlotCondition[];
}

export interface OutfitSlot {
	id: string;
	value: string;
	kind: SlotKind;
	enabled: boolean;
	images: Record<string, OutfitImage>;
	activeImageTag: string | null;

	equipped: boolean;
	conditions: SlotConditionMap;
	synced: boolean;
}

export interface Outfit {
	slots: OutfitSlot[];
}

export interface OutfitCollection {
	saved_outfits: Record<string, Outfit | undefined>;
	current_outfit: Outfit;
	hideDisabled: boolean;
	hideEmpty: boolean;
	snapshots: Record<string, OutfitCachedSnapshot>;
	diffs: Record<string, OutfitCachedDiff>;
	// TODO: move snapshots and diffs to here
}

export type CharactersOutfitMap = Record<string, OutfitCollection | undefined>;

export interface OutfitCollectionsTree {
	bot: CharactersOutfitMap; // each character has their own OutfitCollection
	user: OutfitCollection; // there is only one OutfitCollection for the user
}

export type XY = readonly [number, number];

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

export interface ImageRef {
	url: string;
	height: number;
	width: number;
}

export interface ImageCacheEntry {
	base64: string;
	height: number;
	width: number;
}



export interface OutfitTrackerModel {
	version: number;
	enableSysMessages: boolean;
	autoOpenBot: boolean;
	autoOpenUser: boolean;


	presets: OutfitCollectionsTree;
	botPanel: PanelSettings;
	userPanel: PanelSettings;
	charPanels: CharPanelsTree;

	// key: base64
	images: Record<string, ImageRef>;

	slotPresets: Record<string, SlotPreset>;
}

export interface ExtensionSettingsAugment {
	outfit_tracker?: OutfitTrackerModel;
}
