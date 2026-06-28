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
    updateSlotValue(slotId, value) {
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
    saveOutfitAs(outfitName) {
        const outfit = this.getOutfitView().snapshot();
        OutfitTracker.userOutfits().saveOutfit(outfitName, outfit);
        if (OutfitTracker.areSystemMessagesEnabled()) {
            return `Saved "${outfitName}" outfit for user character.`;
        }
        return '';
    }
    deleteSavedOutfit(outfitName) {
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
    getSavedOutfits() {
        return OutfitTracker.userOutfits().getOutfitNames();
    }
    getOutfitCollection() {
        return OutfitTracker.userOutfits();
    }
}
