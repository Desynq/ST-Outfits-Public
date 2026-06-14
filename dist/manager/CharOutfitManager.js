import { areOutfitSnapshotsEqual } from "../data/model/OutfitSnapshots.js";
import { OutfitTracker } from "../data/tracker.js";
import { toPascalCase } from "../util/StringHelper.js";
import { OutfitManager } from "./OutfitManager.js";
export class CharOutfitManager extends OutfitManager {
    constructor(saveSettings, characterKey, displayName = characterKey) {
        super(saveSettings, toPascalCase(displayName));
        this.characterKey = characterKey;
        this.displayName = displayName;
        this.onActiveOutfitChanged();
    }
    getName() {
        return this.characterKey;
    }
    isUser() {
        return false;
    }
    getNameMacro() {
        return this.characterKey;
    }
    getVarName(namespace) {
        return `${this.characterKey.replace(/\s+/g, ' ')}_${namespace}`;
    }
    async updateSlotValue(slotId, value) {
        const previousValue = this.getValue(slotId);
        void this.setSlotValue(slotId, value);
        if (previousValue === 'None' && value !== 'None') {
            return `${this.characterKey} put on ${value}.`;
        }
        else if (value === 'None') {
            return `${this.characterKey} removed ${previousValue}.`;
        }
        else {
            return `${this.characterKey} changed from ${previousValue} to ${value}.`;
        }
    }
    savePreset(outfitName) {
        const outfit = this.getOutfitView().snapshot();
        OutfitTracker.characterOutfits(this.characterKey).saveOutfit(outfitName, outfit);
        return `Saved "${outfitName}" outfit for ${this.displayName}.`;
    }
    exportPresetToUser(outfitName) {
        const outfit = this.getOutfitView().snapshot();
        OutfitTracker.userOutfits().saveOutfit(outfitName, outfit);
        return `Exported "${outfitName}" outfit to user.`;
    }
    loadPreset(outfitName) {
        const collectionView = OutfitTracker.characterOutfits(this.characterKey);
        const newOutfit = collectionView.getSavedOutfit(outfitName)?.snapshot();
        if (newOutfit === undefined) {
            return 'not-found';
        }
        const oldOutfit = this.getOutfitView().snapshot();
        if (areOutfitSnapshotsEqual(oldOutfit, newOutfit)) {
            return 'already-wearing';
        }
        collectionView.loadOutfit(newOutfit);
        for (const [slot, value] of Object.entries(this.getOutfitView().values)) {
            void this.setSlotValue(slot, value);
        }
        return 'success';
    }
    deletePreset(outfitName) {
        const outfit = OutfitTracker.characterOutfits(this.characterKey).getSavedOutfit(outfitName);
        if (outfit === undefined) {
            return `[Outfit System] Preset "${outfitName}" not found.`;
        }
        OutfitTracker.characterOutfits(this.characterKey).deleteSavedOutfit(outfitName);
        return `Deleted "${outfitName}" outfit.`;
    }
    getPresets() {
        const outfits = OutfitTracker.characterOutfits(this.characterKey).getSavedOutfitNames();
        return outfits;
    }
    getOutfitCollection() {
        return OutfitTracker.characterOutfits(this.characterKey);
    }
    getFullSummaryTag() {
        const tag = this.resolveFullSummaryTag?.();
        if (tag === undefined) {
            return super.getFullSummaryTag();
        }
        return {
            domain: tag.tag,
            openingTag: tag.openingTag,
            closingTag: tag.closingTag
        };
    }
    setFullSummaryTagResolver(fn) {
        this.resolveFullSummaryTag = fn;
        this.updateContext();
    }
}
