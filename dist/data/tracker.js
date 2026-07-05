// @ts-ignore
import { extension_settings } from "../../../../../extensions.js";
import { saveSettings } from "../api/settings.js";
import { notObject } from "../ObjectHelper.js";
import { isRecord } from "../util/narrowing.js";
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
    const raw = settings.outfit_tracker ??= {};
    migrateTracker(raw);
    raw.enableSysMessages ??= false;
    raw.autoOpenUser ??= false;
    raw.autoOpenBot ??= false;
    raw.charPanels = normalizeCharPanels(raw.charPanels);
    normalizeImageBlobs(raw);
    normalizeSlotPresets(raw);
    validatePresets(raw);
    normalizePanelSettings(raw, 'userPanel', defaultUserPanelSettings);
    normalizePanelSettings(raw, 'botPanel', defaultBotPanelSettings);
    raw.version = 1;
    return new Tracker(raw);
}
/**
 * Will always migrate through all the versions when loading mod for the first time
 */
function migrateTracker(raw) {
    const version = typeof raw.version === 'number' ? raw.version : 0;
    if (version < 1) {
        migrateOutfitNamingV1(raw.presets);
        raw.version = 1;
    }
    if (version < 2) {
        migratePanelSettingsV2(raw);
        raw.version = 2;
    }
    if (version < 3) {
        migrateSlotPresets(raw.slotPresets);
        raw.version = 3;
    }
}
function migrateOutfitNamingV1(presets) {
    if (notObject(presets))
        return;
    for (const collection of getPresetCollections(presets)) {
        if (notObject(collection))
            continue;
        const raw = collection;
        if (!('current_outfit' in raw) && 'autoOutfit' in raw) {
            raw.current_outfit = raw.autoOutfit;
        }
        if (!('saved_outfits' in raw) && 'outfits' in raw) {
            raw.saved_outfits = raw.outfits;
        }
        delete raw.autoOutfit;
        delete raw.outfits;
    }
}
function migratePanelSettingsV2(raw) {
    migrateSinglePanelSettingsV2(raw.userPanel);
    migrateSinglePanelSettingsV2(raw.botPanel);
    const charPanels = raw.charPanels;
    if (notObject(charPanels))
        return;
    const panels = charPanels.panels;
    if (notObject(panels))
        return;
    for (const panel of Object.values(panels)) {
        migrateSinglePanelSettingsV2(panel);
    }
}
function migrateSinglePanelSettingsV2(settings) {
    if (!isRecord(settings))
        return;
    if (!('load_state' in settings)) {
        settings.load_state = settings.canLoadFromChat === false
            ? 'global'
            : 'chat';
    }
    delete settings.canLoadFromChat;
}
function migrateSlotPresets(presets) {
    if (!isRecord(presets))
        return;
    for (const p of Object.values(presets)) {
        if (!isRecord(p)) {
            continue;
        }
        // already migrated
        if ("image" in p) {
            continue;
        }
        if (typeof p.imageKey !== 'string' ||
            typeof p.imageWidth !== 'number' ||
            typeof p.imageHeight !== 'number') {
            continue;
        }
        p.image = {
            key: p.imageKey,
            width: p.imageWidth,
            height: p.imageHeight
        };
        delete p.imageKey;
        delete p.imageWidth;
        delete p.imageHeight;
    }
}
function getPresetCollections(presets) {
    const collections = [];
    collections.push(presets.user);
    if (presets.bot && typeof presets.bot === 'object') {
        collections.push(...Object.values(presets.bot));
    }
    return collections;
}
export const OutfitTracker = loadTracker();
await OutfitTracker.migrate();
