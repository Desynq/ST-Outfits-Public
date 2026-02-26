// @ts-ignore
import { extension_settings } from "../../../../../extensions.js";
import { normalizeCharPanels, normalizePanelSettings } from "./mappings/PanelSettings.js";
import { CharactersOutfitMap, ExtensionSettingsAugment, OutfitTrackerModel } from "./model/Outfit.js";
import { normalizeImageBlobs, normalizeSlotPresets, validatePresets } from "./normalize.js";
import { CharPanelsView } from "./view/CharPanelsView.js";
import { CharacterOutfitCollectionView, UserOutfitCollectionView } from "./view/OutfitCollectionView.js";
import { OutfitImagesView } from "./view/OutfitImagesView.js";
import { BotPanelSettingsView, defaultBotPanelSettings, defaultUserPanelSettings, UserPanelSettingsView } from "./view/PanelViews.js";
import { SlotPresetRegistry } from "./view/SlotPresetsView.js";

class Tracker {

	public constructor(
		private settings: OutfitTrackerModel
	) { }

	public areSystemMessagesEnabled() {
		return this.settings.enableSysMessages;
	}

	public isAutoOpen(): { user: boolean, bot: boolean; } {
		return {
			user: this.settings.autoOpenUser,
			bot: this.settings.autoOpenBot
		};
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

	public userPanel(): UserPanelSettingsView {
		return new UserPanelSettingsView(this.settings.userPanel);
	}

	public botPanel(): BotPanelSettingsView {
		return new BotPanelSettingsView(this.settings.botPanel);
	}

	public charPanels(): CharPanelsView {
		return new CharPanelsView(this.settings.charPanels);
	}

	public images(): OutfitImagesView {
		return new OutfitImagesView(this.settings.images);
	}

	public slotPresets(): SlotPresetRegistry {
		return new SlotPresetRegistry(this.settings.slotPresets);
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
	raw.autoOpenUser ??= false;
	raw.autoOpenBot ??= false;
	raw.charPanels = normalizeCharPanels(raw.charPanels);

	normalizeImageBlobs(raw);
	normalizeSlotPresets(raw);
	validatePresets(raw);

	normalizePanelSettings(raw, 'userPanel', defaultUserPanelSettings);
	normalizePanelSettings(raw, 'botPanel', defaultBotPanelSettings);

	return new Tracker(raw as OutfitTrackerModel);
}

export const OutfitTracker = loadTracker();