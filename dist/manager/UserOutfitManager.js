import { areOutfitSnapshotsEqual } from "../data/model/OutfitSnapshots.js";
import { OutfitTracker } from "../data/tracker.js";
import { OutfitManager } from "./OutfitManager.js";
export class UserOutfitManager extends OutfitManager {
    constructor(saveSettings) {
        super(saveSettings, 'user');
        this.onActiveOutfitChanged();
    }
    getName() {
        return "User";
    }
    isUser() {
        return true;
    }
    getNameMacro() {
        return '{{user}}';
    }
    getVarName(namespace) {
        return `User_${namespace}`;
    }
    async updateSlotValue(slotId, value) {
        const previousValue = this.getValue(slotId);
        void this.setSlotValue(slotId, value);
        if (previousValue === 'None' && value !== 'None') {
            return `You put on ${value}.`;
        }
        else if (value === 'None') {
            return `You removed ${previousValue}.`;
        }
        else {
            return `You changed from ${previousValue} to ${value}.`;
        }
    }
    savePreset(outfitName) {
        const outfit = this.getOutfitView().snapshot();
        OutfitTracker.userOutfits().saveOutfit(outfitName, outfit);
        if (OutfitTracker.areSystemMessagesEnabled()) {
            return `Saved "${outfitName}" outfit for user character.`;
        }
        return '';
    }
    loadPreset(outfitName) {
        const newOutfit = OutfitTracker.userOutfits().getSavedOutfit(outfitName)?.snapshot();
        if (newOutfit === undefined) {
            return 'not-found';
        }
        const oldOutfit = this.getOutfitView().snapshot();
        if (areOutfitSnapshotsEqual(oldOutfit, newOutfit)) {
            return 'already-wearing';
        }
        OutfitTracker.userOutfits().loadOutfit(newOutfit);
        for (const [slotId, value] of Object.entries(this.getOutfitView().values)) {
            void this.setSlotValue(slotId, value);
        }
        return 'success';
    }
    deletePreset(outfitName) {
        const outfit = OutfitTracker.userOutfits().getSavedOutfit(outfitName);
        if (outfit === undefined) {
            return `[Outfit System] Preset "${outfitName}" not found.`;
        }
        OutfitTracker.userOutfits().deleteSavedOutfit(outfitName);
        if (OutfitTracker.areSystemMessagesEnabled()) {
            return `Deleted your "${outfitName}" outfit.`;
        }
        return '';
    }
    getPresets() {
        return OutfitTracker.userOutfits().getOutfitNames();
    }
    getOutfitCollection() {
        return OutfitTracker.userOutfits();
    }
}
