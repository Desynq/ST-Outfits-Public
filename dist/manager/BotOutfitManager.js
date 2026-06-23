import { OutfitTracker } from "../data/tracker.js";
import { OutfitManager } from "./OutfitManager.js";
export class BotOutfitManager extends OutfitManager {
    constructor(saveSettings, defaultCharacter) {
        super(saveSettings, 'char');
        this.setCharacter(defaultCharacter ?? 'Unknown');
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
        return `${this.character.replace(/\s+/g, ' ')}_${namespace}`;
    }
    setCharacter(name) {
        if (name === this.character)
            return;
        this.character = name;
        this.onActiveOutfitChanged();
    }
    async updateSlotValue(slotId, value) {
        const previousValue = this.getValue(slotId);
        void this.setSlotValue(slotId, value);
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
    savePreset(outfitName) {
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
