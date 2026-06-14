import { areOutfitSnapshotsEqual } from "../data/model/OutfitSnapshots.js";
import { OutfitTracker } from "../data/tracker.js";
import { IOutfitCollectionView } from "../data/view/OutfitCollectionView.js";
import { LoadPresetResult, OutfitManager } from "./OutfitManager.js";

export class UserOutfitManager extends OutfitManager {
    public constructor(
        saveSettings: () => void
    ) {
        super(saveSettings, 'user');
        this.onActiveOutfitChanged();
    }

    public override getName(): string {
        return "User";
    }

    public override isUser(): boolean {
        return true;
    }

    public override getNameMacro(): string {
        return '{{user}}';
    }

    public override getVarName(namespace: string): string {
        return `User_${namespace}`;
    }

    public override async updateSlotValue(slotId: string, value: string): Promise<string> {
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

    public savePreset(outfitName: string): string {
        const outfit = this.getOutfitView().snapshot();

        OutfitTracker.userOutfits().saveOutfit(outfitName, outfit);

        if (OutfitTracker.areSystemMessagesEnabled()) {
            return `Saved "${outfitName}" outfit for user character.`;
        }
        return '';
    }

    public loadPreset(outfitName: string): LoadPresetResult {
        const newOutfit = OutfitTracker.userOutfits().getSavedOutfit(outfitName)?.snapshot();
        if (newOutfit === undefined) {
            return 'not-found';
        }

        const oldOutfit = this.getOutfitView().snapshot();

        if (areOutfitSnapshotsEqual(oldOutfit, newOutfit)) {
            return 'already-wearing';
        }

        OutfitTracker.userOutfits().setAutosavedOutfit(newOutfit);

        for (const [slotId, value] of Object.entries(this.getOutfitView().values)) {
            void this.setSlotValue(slotId, value);
        }

        return 'success';
    }

    public deletePreset(outfitName: string): string {
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

    public getPresets(): string[] {
        return OutfitTracker.userOutfits().getOutfitNames();
    }

    public override getOutfitCollection(): IOutfitCollectionView {
        return OutfitTracker.userOutfits();
    }
}
