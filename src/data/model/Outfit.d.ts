import type { CharacterNoteType } from "../../Constants.js";
import type { SettingsModel } from "./settings.js";

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



export type TraitIcon =
	| {
		type: 'font-awesome';
		className: string;
		color: string | null;
	}
	| {
		type: 'image';
		image: OutfitImage;
	};

export interface TraitDefinition {
	id: string; // generated uuid
	name: string; // non-unique display name, supports any char
	group: string;
	description: string; // what the trait does
	contextInline: boolean;

	icon: TraitIcon | null;
}

export interface TraitDefinitionV1 {
	id: string; // kebab-case unique identifier that also served as name
	description: string;
	icon: TraitIcon | null;
}


export interface TraitAssignment {
	traitId: string;
	addendum: string | null;
	contextualizeInline: boolean;
}

export interface TraitRegistry {
	definitions: Record<string, TraitDefinition>;
}

export interface TraitSlot extends ContextSlotBase {
	type: 'traits';
	traits: TraitAssignment[];
}

export interface TextSlot extends ContextSlotBase {
	type: 'text'; // general context slot type for right now
	value: string;
}

export interface ContextSlotBase {
	id: string; // unique identifier
	kind: SlotKind; // what group/tab the slot belongs to
	enabled: boolean; // whether the slot be contextualized

	// list of images associated with the slot that can be quickly chosen when changing the active image
	images: Record<string, OutfitImage>;
	activeImageTag: string | null; // which image to display

	equipped: boolean; // Later: Add slot status system
	conditions: SlotConditionMap; // under what conditions should the slot be contextualized
	// whether the slot has its changes saved to the sync registry for other synced slots to pull from.
	// mostly used for shared slots between outfits/characters/stories
	synced: boolean;
}

export type ContextSlot = TextSlot | TraitSlot;

export interface Outfit {
	slots: ContextSlot[];
}

export interface CharacterNote {
	text: string;
}

export type SlotCharacterNotes = Partial<Record<CharacterNoteType, CharacterNote>>;

export type CharacterNotes = {
	[character: string]: {
		[slotId: string]: SlotCharacterNotes;
	};
};

export interface OutfitCollection {
	saved_outfits: { [slotId: string]: Outfit | undefined; };
	current_outfit: Outfit;
	hideDisabled: boolean;
	hideEmpty: boolean;

	character_notes: CharacterNotes;

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



export interface ExtensionSettingsAugment {
	outfit_tracker?: SettingsModel;
}
