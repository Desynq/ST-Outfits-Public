// @ts-ignore
import { extension_settings } from "../../../../../extensions.js";
import { MutableOutfitView } from "./view/MutableOutfitView.js";
import { OutfitView } from "./view/OutfitView.js";
import { normalizeOutfitCollection, validatePresets } from "./normalize.js";
import { DEFAULT_SLOTS } from "../Constants.js";
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
}
class OutfitCollectionView {
    constructor() { }
    withCollection(fn) {
        const collection = this.getOrCreateCollection();
        return fn(collection);
    }
    getOrCreateAutosaved() {
        const c = this.getOrCreateCollection();
        c.autoOutfit ?? (c.autoOutfit = this.createDefaultOutfit());
        return new MutableOutfitView('auto', c.autoOutfit);
    }
    createDefaultOutfit() {
        return {
            slots: [...DEFAULT_SLOTS]
        };
    }
    areDisabledSlotsHidden() {
        return this.withCollection(c => c.hideDisabled);
    }
    hideDisabledSlots(hide) {
        this.withCollection(c => c.hideDisabled = hide);
    }
    areEmptySlotsHidden() {
        return this.withCollection(c => c.hideEmpty);
    }
    hideEmptySlots(hide) {
        this.withCollection(c => c.hideEmpty = hide);
    }
}
class UserOutfitCollectionView extends OutfitCollectionView {
    constructor(collection) {
        super();
        this.collection = collection;
    }
    getOrCreateCollection() {
        return this.collection;
    }
    getOutfitNames() {
        return Object.keys(this.collection.outfits);
    }
    getSavedOutfit(outfitName) {
        const outfit = this.collection.outfits[outfitName];
        if (outfit === undefined)
            return undefined;
        return new OutfitView(outfitName, outfit);
    }
    saveOutfit(outfitName, outfit) {
        this.collection.outfits[outfitName] = outfit;
    }
    setAutosavedOutfit(outfit) {
        this.collection.autoOutfit = outfit;
    }
    deleteSavedOutfit(outfitName) {
        delete this.collection.outfits[outfitName];
    }
}
class CharacterOutfitMapView {
    constructor(map) {
        this.map = map;
    }
    outfits(character) {
        return new CharacterOutfitCollectionView(this.map, character);
    }
    clearOutfits(character) {
        delete this.map[character];
    }
}
class CharacterOutfitCollectionView extends OutfitCollectionView {
    constructor(map, character) {
        super();
        this.map = map;
        this.character = character;
    }
    getOrCreateCollection() {
        const existing = this.getOutfitCollection();
        if (existing)
            return existing;
        const created = normalizeOutfitCollection({});
        this.map[this.character] = created;
        return created;
    }
    hasCollection() {
        return this.map[this.character] === undefined;
    }
    getOutfitCollection() {
        return this.map[this.character];
    }
    getSavedOutfitNames() {
        const collection = this.getOutfitCollection();
        if (collection === undefined)
            return [];
        return Object.keys(collection.outfits);
    }
    getSavedOutfit(outfitName) {
        if (this.hasCollection())
            return undefined;
        const collection = this.getOrCreateCollection();
        const outfit = collection.outfits[outfitName];
        if (outfit === undefined)
            return undefined;
        return new OutfitView(outfitName, outfit);
    }
    saveOutfit(outfitName, outfit) {
        this.getOrCreateCollection().outfits[outfitName] = outfit;
    }
    deleteSavedOutfit(outfitName) {
        const outfits = this.getOutfitCollection();
        if (outfits === undefined)
            return;
        delete outfits.outfits[outfitName];
    }
    loadOutfit(outfit) {
        this.getOrCreateCollection().autoOutfit = outfit;
    }
    clear() {
        delete this.map[this.character];
    }
}
const settings = extension_settings;
function loadTracker() {
    const raw = settings.outfit_tracker ?? (settings.outfit_tracker = {});
    validatePresets(raw);
    raw.enableSysMessages ?? (raw.enableSysMessages = false);
    return new Tracker(raw);
}
export const OutfitTracker = loadTracker();
