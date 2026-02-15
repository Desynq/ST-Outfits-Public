// @ts-ignore
import { extension_settings } from "../../../../../extensions.js";
import { normalizePanelSettings } from "./mappings/PanelSettings.js";
import { normalizeImageBlobs, validatePresets } from "./normalize.js";
import { CharacterOutfitCollectionView, UserOutfitCollectionView } from "./view/OutfitCollectionView.js";
import { OutfitImagesView } from "./view/OutfitImagesView.js";
import { BotPanelSettingsView, defaultBotPanelSettings, defaultUserPanelSettings, UserPanelSettingsView } from "./view/PanelViews.js";
const PANEL_SETTINGS_FACTORIES = {
    user: (s) => new UserPanelSettingsView(s.userPanel),
    bot: (s) => new BotPanelSettingsView(s.botPanel)
};
class Tracker {
    constructor(settings) {
        this.settings = settings;
    }
    areSystemMessagesEnabled() {
        return this.settings.enableSysMessages;
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
    panelSettings(type) {
        const factory = PANEL_SETTINGS_FACTORIES[type];
        return factory(this.settings);
    }
    images() {
        return new OutfitImagesView(this.settings.images);
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
    normalizeImageBlobs(raw);
    validatePresets(raw);
    normalizePanelSettings(raw, 'userPanel', defaultUserPanelSettings);
    normalizePanelSettings(raw, 'botPanel', defaultBotPanelSettings);
    return new Tracker(raw);
}
export const OutfitTracker = loadTracker();
