import { areOutfitSnapshotsEqual } from "../data/model/OutfitSnapshots.js";
import { OutfitTracker } from "../data/tracker.js";
import { OutfitManager } from "./OutfitManager.js";
export class BotOutfitManager extends OutfitManager {
    constructor(settingsSaver) {
        super(settingsSaver);
        this.setCharacter('Unknown');
    }
    getName() {
        return this.character;
    }
    isUser() {
        return false;
    }
    getNameMacro() {
        return '{{char}}';
    }
    getVarName(namespace) {
        return `${this.character.replace(/\s+/g, '_')}_${namespace}`;
    }
    setCharacter(name) {
        if (name === this.character)
            return;
        this.character = name;
        this.onActiveOutfitChanged();
    }
    async setOutfitItem(slotId, value) {
        const previousValue = this.getValue(slotId);
        this.applyOutfitValue(slotId, value);
        if (previousValue === 'None' && value !== 'None') {
            return `${this.character} put on ${value}.`;
        }
        else if (value === 'None') {
            return `${this.character} removed ${previousValue}.`;
        }
        else {
            return `${this.character} changed from ${previousValue} to ${value}.`;
        }
    }
    async savePreset(outfitName) {
        const outfit = this.getOutfitView().snapshot();
        OutfitTracker.characterOutfits(this.character).saveOutfit(outfitName, outfit);
        if (OutfitTracker.areSystemMessagesEnabled()) {
            return `Saved "${outfitName}" outfit for ${this.character}.`;
        }
        return '';
    }
    exportPresetToUser(outfitName) {
        const outfit = this.getOutfitView().snapshot();
        OutfitTracker.userOutfits().saveOutfit(outfitName, outfit);
        if (OutfitTracker.areSystemMessagesEnabled()) {
            return `Exported "${outfitName}" outfit to user.`;
        }
        return "";
    }
    async loadPreset(outfitName) {
        const collectionView = OutfitTracker.characterOutfits(this.character);
        const newOutfit = collectionView.getSavedOutfit(outfitName)?.snapshot();
        if (newOutfit === undefined) {
            return `[Outfit System] Preset "${outfitName}" not found.`;
        }
        const oldOutfit = this.getOutfitView().snapshot();
        if (areOutfitSnapshotsEqual(oldOutfit, newOutfit)) {
            return `${this.character} was already wearing the "${outfitName}" outfit.`;
        }
        collectionView.loadOutfit(newOutfit);
        for (const [slot, value] of Object.entries(this.getOutfitView().values)) {
            this.applyOutfitValue(slot, value);
        }
        return `${this.character} changed into the "${outfitName}" outfit.`;
    }
    deletePreset(outfitName) {
        const outfit = OutfitTracker.characterOutfits(this.character).getSavedOutfit(outfitName);
        if (outfit === undefined) {
            return `[Outfit System] Preset "${outfitName}" not found.`;
        }
        OutfitTracker.characterOutfits(this.character).deleteSavedOutfit(outfitName);
        if (OutfitTracker.areSystemMessagesEnabled()) {
            return `Deleted "${outfitName}" outfit.`;
        }
        return '';
    }
    getPresets() {
        const outfits = OutfitTracker.characterOutfits(this.character).getSavedOutfitNames();
        return outfits;
    }
    getOutfitCollection() {
        return OutfitTracker.characterOutfits(this.character);
    }
}
