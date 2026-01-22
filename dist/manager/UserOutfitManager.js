import { OutfitManager } from "./OutfitManager.js";
import { OutfitTracker } from "../outfit/tracker.js";
import { areOutfitSnapshotsEqual } from "../outfit/model/OutfitSnapshots.js";
export class UserOutfitManager extends OutfitManager {
    constructor(settingsSaver) {
        super(settingsSaver);
        this.onActiveOutfitChanged();
    }
    getName() {
        return "User";
    }
    isUser() {
        return true;
    }
    getVarName(namespace) {
        return `User_${namespace}`;
    }
    async setOutfitItem(slotId, value) {
        const previousValue = this.getValue(slotId);
        this.applyOutfitValue(slotId, value);
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
    async savePreset(outfitName) {
        const outfit = this.getOutfitView().snapshot();
        OutfitTracker.userOutfits().saveOutfit(outfitName, outfit);
        if (OutfitTracker.areSystemMessagesEnabled()) {
            return `Saved "${outfitName}" outfit for user character.`;
        }
        return '';
    }
    async loadPreset(outfitName) {
        const newOutfit = OutfitTracker.userOutfits().getSavedOutfit(outfitName)?.snapshot();
        if (newOutfit === undefined) {
            return `[Outfit System] Preset "${outfitName}" not found.`;
        }
        const oldOutfit = this.getOutfitView().snapshot();
        if (areOutfitSnapshotsEqual(oldOutfit, newOutfit)) {
            return `You are already wearing the "${outfitName}" outfit.`;
        }
        OutfitTracker.userOutfits().setAutosavedOutfit(newOutfit);
        this.getOutfitView().values;
        for (const [slotId, value] of Object.entries(this.getOutfitView().values)) {
            this.applyOutfitValue(slotId, value);
        }
        return `You changed into the "${outfitName}" outfit.`;
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
