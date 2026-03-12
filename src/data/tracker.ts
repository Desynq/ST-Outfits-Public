// @ts-ignore
import { extension_settings } from "../../../../../extensions.js";
import { saveSettings } from "../api/settings.js";
import { normalizeCharPanels, normalizePanelSettings } from "./mappings/PanelSettings.js";
import { CharactersOutfitMap, ExtensionSettingsAugment, ImageBlob, ImageCacheEntry, ImageRef, OutfitTrackerModel } from "./model/Outfit.js";
import { normalizeImageBlobs, normalizeSlotPresets, validatePresets } from "./normalize.js";
import { CharPanelsView } from "./view/CharPanelsView.js";
import { CharacterOutfitCollectionView, UserOutfitCollectionView } from "./view/OutfitCollectionView.js";
import { OutfitGalleryView } from "./view/OutfitGalleryView.js";
import { BotPanelSettingsView, defaultBotPanelSettings, defaultUserPanelSettings, UserPanelSettingsView } from "./view/PanelViews.js";
import { SlotPresetRegistry } from "./view/SlotPresetsView.js";

class Tracker {

	private readonly imageCache: Map<string, ImageCacheEntry> = new Map();

	public constructor(
		private readonly settings: OutfitTrackerModel
	) { }

	public areSystemMessagesEnabled(): boolean {
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

	public viewCharPanels(): CharPanelsView {
		return new CharPanelsView(this.settings.charPanels);
	}

	public viewGallery(): OutfitGalleryView {
		return new OutfitGalleryView(
			this.settings.images,
			this.imageCache,
			'st-outfits'
		);
	}

	public slotPresets(): SlotPresetRegistry {
		return new SlotPresetRegistry(this.settings.slotPresets);
	}



	public async migrate(): Promise<void> {
		const images = this.settings.images as Record<string, ImageBlob | ImageRef>;
		const gallery = this.viewGallery();

		const tasks = Object.entries(images)
			.filter(([, blob]) => 'base64' in blob)
			.map(async ([key, blob]) => {
				const legacy = blob as ImageBlob;

				const newKey = await gallery.addImage(
					legacy.base64,
					legacy.width,
					legacy.height,
					true
				);

				return { oldKey: key, newKey };
			});

		if (tasks.length === 0) return;

		const results = await Promise.all(tasks);

		let changed = false;

		for (const { oldKey, newKey } of results) {
			if (newKey !== oldKey) {
				delete images[oldKey];
				changed = true;
			}
		}

		if (changed) {
			saveSettings();
		}
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
await OutfitTracker.migrate();