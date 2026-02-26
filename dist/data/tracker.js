// @ts-ignore
import { extension_settings } from "../../../../../extensions.js";
import { normalizeCharPanels, normalizePanelSettings } from "./mappings/PanelSettings.js";
import { normalizeImageBlobs, normalizeSlotPresets, validatePresets } from "./normalize.js";
import { CharPanelsView } from "./view/CharPanelsView.js";
import { CharacterOutfitCollectionView, UserOutfitCollectionView } from "./view/OutfitCollectionView.js";
import { OutfitImagesView } from "./view/OutfitImagesView.js";
import { BotPanelSettingsView, defaultBotPanelSettings, defaultUserPanelSettings, UserPanelSettingsView } from "./view/PanelViews.js";
import { SlotPresetRegistry } from "./view/SlotPresetsView.js";
class Tracker {
    constructor(settings) {
        this.settings = settings;
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
    charPanels() {
        return new CharPanelsView(this.settings.charPanels);
    }
    images() {
        return new OutfitImagesView(this.settings.images);
    }
    slotPresets() {
        return new SlotPresetRegistry(this.settings.slotPresets);
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
