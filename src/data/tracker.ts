// @ts-ignore
import { extension_settings } from "../../../../../extensions.js";
import { DEFAULT_SLOTS } from "../Constants.js";
import type { PanelType } from "../types/maps.js";
import { normalizePanelSettings } from "./mappings/PanelSettings.js";
import { CharactersOutfitMap, ExtensionSettingsAugment, Outfit, OutfitCollection, OutfitTrackerModel } from "./model/Outfit.js";
import { OutfitSnapshot } from "./model/OutfitSnapshots.js";
import { normalizeOutfitCollection, validatePresets } from "./normalize.js";
import { MutableOutfitView } from "./view/MutableOutfitView.js";
import { OutfitView } from "./view/OutfitView.js";
import { BotPanelSettingsView, defaultBotPanelSettings, defaultUserPanelSettings, PanelSettingsMap, PanelSettingsViewMap, UserPanelSettingsView } from "./view/PanelViews.js";

const PANEL_SETTINGS_FACTORIES = {
	user: (s: PanelSettingsMap) => new UserPanelSettingsView(s.userPanel),
	bot: (s: PanelSettingsMap) => new BotPanelSettingsView(s.botPanel)
} satisfies {
	[K in PanelType]: (s: PanelSettingsMap) => PanelSettingsViewMap[K];
};

class Tracker {

	public constructor(
		private settings: OutfitTrackerModel
	) { }

	public areSystemMessagesEnabled() {
		return this.settings.enableSysMessages;
	}

	public characters(): CharacterOutfitMapView {
		return new CharacterOutfitMapView(this.settings.presets.bot);
	}

	public characterOutfits(character: string): CharacterOutfitCollectionView {
		return this.characters().outfits(character);
	}

	public userOutfits(): UserOutfitCollectionView {
		return new UserOutfitCollectionView(this.settings.presets.user);
	}

	public panelSettings<T extends PanelType>(type: T): PanelSettingsViewMap[T] {
		const factory = PANEL_SETTINGS_FACTORIES[type] as (
			s: PanelSettingsMap
		) => PanelSettingsViewMap[T];

		return factory(this.settings);
	}
}

export interface IOutfitCollectionView {
	getOrCreateAutosaved(): MutableOutfitView;

	areDisabledSlotsHidden(): boolean;
	hideDisabledSlots(hide: boolean): void;

	areEmptySlotsHidden(): boolean;
	hideEmptySlots(hide: boolean): void;
}

abstract class OutfitCollectionView implements IOutfitCollectionView {

	public constructor() { }

	protected abstract getOrCreateCollection(): OutfitCollection;

	protected withCollection<T>(fn: (c: OutfitCollection) => T): T {
		const collection = this.getOrCreateCollection();
		return fn(collection);
	}

	public getOrCreateAutosaved(): MutableOutfitView {
		const c = this.getOrCreateCollection();

		c.autoOutfit ??= this.createDefaultOutfit();
		return new MutableOutfitView('auto', c.autoOutfit);
	}

	protected createDefaultOutfit(): Outfit {
		return {
			slots: [...DEFAULT_SLOTS]
		};
	}

	public areDisabledSlotsHidden(): boolean {
		return this.withCollection(c => c.hideDisabled);
	}

	public hideDisabledSlots(hide: boolean): void {
		this.withCollection(c => c.hideDisabled = hide);
	}


	public areEmptySlotsHidden(): boolean {
		return this.withCollection(c => c.hideEmpty);
	}

	public hideEmptySlots(hide: boolean): void {
		this.withCollection(c => c.hideEmpty = hide);
	}
}

class UserOutfitCollectionView extends OutfitCollectionView {
	public constructor(
		private collection: OutfitCollection
	) {
		super();
	}

	protected override getOrCreateCollection(): OutfitCollection {
		return this.collection;
	}

	public getOutfitNames(): string[] {
		return Object.keys(this.collection.outfits);
	}

	public getSavedOutfit(outfitName: string): OutfitView | undefined {
		const outfit = this.collection.outfits[outfitName];
		if (outfit === undefined) return undefined;


		return new OutfitView(outfitName, outfit);
	}

	public saveOutfit(outfitName: string, outfit: OutfitSnapshot): void {
		this.collection.outfits[outfitName] = outfit;
	}

	public setAutosavedOutfit(outfit: OutfitSnapshot): void {
		this.collection.autoOutfit = outfit;
	}

	public deleteSavedOutfit(outfitName: string): void {
		delete this.collection.outfits[outfitName];
	}
}

class CharacterOutfitMapView {
	public constructor(
		private map: CharactersOutfitMap
	) { }

	public outfits(character: string): CharacterOutfitCollectionView {
		return new CharacterOutfitCollectionView(this.map, character);
	}

	public clearOutfits(character: string): void {
		delete this.map[character];
	}
}

class CharacterOutfitCollectionView extends OutfitCollectionView {
	public constructor(
		private map: CharactersOutfitMap,
		private character: string
	) {
		super();
	}

	protected override getOrCreateCollection(): OutfitCollection {
		const existing = this.getOutfitCollection();
		if (existing) return existing;

		const created = normalizeOutfitCollection({});
		this.map[this.character] = created;
		return created;
	}

	public hasCollection(): boolean {
		return this.map[this.character] === undefined;
	}

	private getOutfitCollection(): OutfitCollection | undefined {
		return this.map[this.character];
	}

	public getSavedOutfitNames(): string[] {
		const collection = this.getOutfitCollection();
		if (collection === undefined) return [];
		return Object.keys(collection.outfits);
	}

	public getSavedOutfit(outfitName: string): OutfitView | undefined {
		if (this.hasCollection()) return undefined;

		const collection = this.getOrCreateCollection();
		const outfit = collection.outfits[outfitName];
		if (outfit === undefined) return undefined;

		return new OutfitView(outfitName, outfit);
	}

	public saveOutfit(outfitName: string, outfit: OutfitSnapshot): void {
		this.getOrCreateCollection().outfits[outfitName] = outfit;
	}

	public deleteSavedOutfit(outfitName: string): void {
		const outfits = this.getOutfitCollection();
		if (outfits === undefined) return;

		delete outfits.outfits[outfitName];
	}

	public loadOutfit(outfit: OutfitSnapshot): void {
		this.getOrCreateCollection().autoOutfit = outfit;
	}

	public clear(): void {
		delete this.map[this.character];
	}
}

const settings = extension_settings as typeof extension_settings & ExtensionSettingsAugment;

function loadTracker(): Tracker {
	const raw: Partial<OutfitTrackerModel> = settings.outfit_tracker ??= {};

	raw.enableSysMessages ??= false;
	validatePresets(raw);

	normalizePanelSettings(raw, 'userPanel', defaultUserPanelSettings);
	normalizePanelSettings(raw, 'botPanel', defaultBotPanelSettings);

	return new Tracker(raw as OutfitTrackerModel);
}

export const OutfitTracker = loadTracker();