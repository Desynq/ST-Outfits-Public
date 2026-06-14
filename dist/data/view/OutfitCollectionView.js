import { ChatOutfitStorage } from "../../api/chat-metadata.js";
import { DEFAULT_SLOTS } from "../../Constants.js";
import { normalizeOutfitCollection } from "../normalize.js";
import { MutableOutfitView } from "./MutableOutfitView.js";
import { OutfitSnapshotsView } from "./OutfitSnapshotsView.js";
import { OutfitView } from "./OutfitView.js";
export class OutfitCollectionView {
    constructor() { }
    withCollection(fn) {
        const collection = this.getOrCreateCollection();
        return fn(collection);
    }
    getOrCreateAutosaved() {
        const c = this.getOrCreateCollection();
        c.current_outfit ?? (c.current_outfit = this.createDefaultOutfit());
        return new MutableOutfitView('auto', c.current_outfit);
    }
    clearCurrentOutfit() {
        const c = this.getOrCreateCollection();
        c.current_outfit = { slots: [] };
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
    getSnapshotView() {
        const c = this.getOrCreateCollection();
        return new OutfitSnapshotsView(c.snapshots);
    }
}
export class UserOutfitCollectionView extends OutfitCollectionView {
    constructor(collection) {
        super();
        this.collection = collection;
    }
    getOrCreateCollection() {
        return this.collection;
    }
    getOutfitNames() {
        return Object.keys(this.collection.saved_outfits);
    }
    getSavedOutfit(outfitName) {
        const outfit = this.collection.saved_outfits[outfitName];
        if (outfit === undefined)
            return undefined;
        return new OutfitView(outfitName, outfit);
    }
    saveOutfit(outfitName, outfit) {
        this.collection.saved_outfits[outfitName] = outfit;
    }
    setAutosavedOutfit(outfit) {
        this.collection.current_outfit = outfit;
    }
    deleteSavedOutfit(outfitName) {
        delete this.collection.saved_outfits[outfitName];
    }
}
export class CharacterOutfitCollectionView extends OutfitCollectionView {
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
        return Object.keys(collection.saved_outfits);
    }
    getSavedOutfit(outfitName) {
        if (this.hasCollection())
            return undefined;
        const collection = this.getOrCreateCollection();
        const outfit = collection.saved_outfits[outfitName];
        if (outfit === undefined)
            return undefined;
        return new OutfitView(outfitName, outfit);
    }
    saveOutfit(outfitName, outfit) {
        this.getOrCreateCollection().saved_outfits[outfitName] = outfit;
    }
    deleteSavedOutfit(outfitName) {
        const outfits = this.getOutfitCollection();
        if (outfits === undefined)
            return;
        delete outfits.saved_outfits[outfitName];
    }
    loadOutfit(outfit) {
        this.getOrCreateCollection().current_outfit = outfit;
    }
    clear() {
        delete this.map[this.character];
    }
    loadCurrentOutfitFromChat() {
        const c = this.getOrCreateCollection();
        c.current_outfit ?? (c.current_outfit = this.createDefaultOutfit());
        ChatOutfitStorage.loadOutfitInto(c.current_outfit, this.character);
    }
    saveCurrentOutfitToChat() {
        const c = this.getOrCreateCollection();
        ChatOutfitStorage.saveOutfitToChat(c.current_outfit, this.character);
    }
}
