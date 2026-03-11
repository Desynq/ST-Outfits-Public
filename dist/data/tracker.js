// @ts-ignore
import { extension_settings } from "../../../../../extensions.js";
import { saveSettings } from "../api/settings.js";
import { normalizeCharPanels, normalizePanelSettings } from "./mappings/PanelSettings.js";
import { normalizeImageBlobs, normalizeSlotPresets, validatePresets } from "./normalize.js";
import { CharPanelsView } from "./view/CharPanelsView.js";
import { CharacterOutfitCollectionView, UserOutfitCollectionView } from "./view/OutfitCollectionView.js";
import { OutfitGalleryView } from "./view/OutfitGalleryView.js";
import { BotPanelSettingsView, defaultBotPanelSettings, defaultUserPanelSettings, UserPanelSettingsView } from "./view/PanelViews.js";
import { SlotPresetRegistry } from "./view/SlotPresetsView.js";
class Tracker {
    constructor(settings) {
        this.settings = settings;
        this.imageCache = new Map();
    }
    areSystemMessagesEnabled() {
        return this.settings.enableSysMessages;
    }
    isAutoOpen() {
        return {
            user: this.settings.autoOpenUser,
            bot: this.settings.autoOpenBot
        };
    }
    characters() {
        return new CharacterOutfitMapView(this.settings.presets.bot);
    }
    characterOutfits(character) {
        return this.characters().outfits(character);
    }
    userOutfits() {
        return new UserOutfitCollectionView(this.settings.presets.user);
    }
    userPanel() {
        return new UserPanelSettingsView(this.settings.userPanel);
    }
    botPanel() {
        return new BotPanelSettingsView(this.settings.botPanel);
    }
    viewCharPanels() {
        return new CharPanelsView(this.settings.charPanels);
    }
    viewGallery() {
        return new OutfitGalleryView(this.settings.images, this.imageCache, 'st-outfits');
    }
    slotPresets() {
        return new SlotPresetRegistry(this.settings.slotPresets);
    }
    async migrate() {
        const images = this.settings.images;
        const gallery = this.viewGallery();
        const tasks = Object.entries(images)
            .filter(([, blob]) => 'base64' in blob)
            .map(async ([key, blob]) => {
            const legacy = blob;
            const newKey = await gallery.addImage(legacy.base64, legacy.width, legacy.height, true);
            return { oldKey: key, newKey };
        });
        if (tasks.length === 0)
            return;
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
    constructor(map) {
        this.map = map;
    }
    outfits(character) {
        return new CharacterOutfitCollectionView(this.map, character);
    }
    characters() {
        return Object.keys(this.map);
    }
    clearOutfits(character) {
        delete this.map[character];
    }
}
const settings = extension_settings;
function loadTracker() {
    const raw = settings.outfit_tracker ?? (settings.outfit_tracker = {});
    raw.enableSysMessages ?? (raw.enableSysMessages = false);
    raw.autoOpenUser ?? (raw.autoOpenUser = false);
    raw.autoOpenBot ?? (raw.autoOpenBot = false);
    raw.charPanels = normalizeCharPanels(raw.charPanels);
    normalizeImageBlobs(raw);
    normalizeSlotPresets(raw);
    validatePresets(raw);
    normalizePanelSettings(raw, 'userPanel', defaultUserPanelSettings);
    normalizePanelSettings(raw, 'botPanel', defaultBotPanelSettings);
    return new Tracker(raw);
}
export const OutfitTracker = loadTracker();
await OutfitTracker.migrate();
