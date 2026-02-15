// @ts-ignore
import { extension_settings } from "../../../../../extensions.js";
import type { PanelType } from "../types/maps.js";
import { ensureRecordProperty } from "../util/narrowing.js";
import { normalizePanelSettings } from "./mappings/PanelSettings.js";
import { CharactersOutfitMap, ExtensionSettingsAugment, OutfitTrackerModel } from "./model/Outfit.js";
import { normalizeImageBlobs, validatePresets } from "./normalize.js";
import { CharacterOutfitCollectionView, UserOutfitCollectionView } from "./view/OutfitCollectionView.js";
import { OutfitImagesView } from "./view/OutfitImagesView.js";
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

	public images(): OutfitImagesView {
		return new OutfitImagesView(this.settings.images);
	}
}

class CharacterOutfitMapView {
	public constructor(
		private map: CharactersOutfitMap
	) { }

	public outfits(character: string): CharacterOutfitCollectionView {
		return new CharacterOutfitCollectionView(this.map, character);
	}

	public characters(): string[] {
		return Object.keys(this.map);
	}

	public clearOutfits(character: string): void {
		delete this.map[character];
	}
}

const settings = extension_settings as typeof extension_settings & ExtensionSettingsAugment;

function loadTracker(): Tracker {
	const raw: Partial<OutfitTrackerModel> = settings.outfit_tracker ??= {};

	raw.enableSysMessages ??= false;
	normalizeImageBlobs(raw);
	validatePresets(raw);

	normalizePanelSettings(raw, 'userPanel', defaultUserPanelSettings);
	normalizePanelSettings(raw, 'botPanel', defaultBotPanelSettings);

	return new Tracker(raw as OutfitTrackerModel);
}

export const OutfitTracker = loadTracker();