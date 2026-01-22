import { OutfitManager } from "./OutfitManager.js";
import { IOutfitCollectionView, OutfitTracker } from "../outfit/tracker.js";
import { MutableOutfitView } from "../outfit/view/MutableOutfitView.js";
import { areOutfitSnapshotsEqual } from "../outfit/model/OutfitSnapshots.js";

export class BotOutfitManager extends OutfitManager {
    public character!: string;

    public constructor(
        settingsSaver: Function
    ) {
        super(settingsSaver);
        this.setCharacter('Unknown');
    }

    public override getName(): string {
        return this.character;
    }

    public override isUser(): boolean {
        return false;
    }

    public setCharacter(name: string) {
        if (name === this.character) return;
        this.character = name;
        this.onActiveOutfitChanged();
    }

    public override getVarName(namespace: string) {
        return `${this.character.replace(/\s+/g, '_')}_${namespace}`;
    }

    public async setOutfitItem(slotId: string, value: string): Promise<string> {
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

    public async savePreset(outfitName: string) {
        const outfit = this.getOutfitView().snapshot();

        OutfitTracker.characterOutfits(this.character).saveOutfit(outfitName, outfit);

        if (OutfitTracker.areSystemMessagesEnabled()) {
            return `Saved "${outfitName}" outfit for ${this.character}.`;
        }
        return '';
    }

    public exportPresetToUser(outfitName: string) {
        const outfit = this.getOutfitView().snapshot();

        OutfitTracker.userOutfits().saveOutfit(outfitName, outfit);

        if (OutfitTracker.areSystemMessagesEnabled()) {
            return `Exported "${outfitName}" outfit to user.`;
        }
        return "";
    }

    public override async loadPreset(outfitName: string) {
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

    public deletePreset(outfitName: string) {
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

    public getPresets() {
        const outfits = OutfitTracker.characterOutfits(this.character).getSavedOutfitNames();

        return outfits;
    }

    public override getOutfitCollection(): IOutfitCollectionView {
        return OutfitTracker.characterOutfits(this.character);
    }
}
