import { areOutfitSnapshotsEqual } from "../data/model/OutfitSnapshots.js";
import { FullSummaryTag } from "../data/model/Panels.js";
import { OutfitTracker } from "../data/tracker.js";
import { ICharacterOutfitCollectionView, IOutfitCollectionView } from "../data/view/OutfitCollectionView.js";
import { toPascalCase } from "../util/StringHelper.js";
import { LoadPresetResult, OutfitManager } from "./OutfitManager.js";



export class CharOutfitManager extends OutfitManager {

	public readonly characterKey: string;
	public readonly displayName: string;

	private resolveFullSummaryTag?: () => FullSummaryTag | undefined;

	public constructor(
		saveSettings: () => void,
		characterKey: string,
		displayName: string = characterKey
	) {
		super(saveSettings, toPascalCase(displayName));

		this.characterKey = characterKey;
		this.displayName = displayName;

		this.onActiveOutfitChanged();
	}

	public override getName(): string {
		return this.characterKey;
	}

	public override isUser(): boolean {
		return false;
	}

	public override getNameMacro(): string {
		return this.characterKey;
	}

	public override getVarName(namespace: string): string {
		return `${this.characterKey.replace(/\s+/g, ' ')}_${namespace}`;
	}

	public override updateSlotValue(slotId: string, value: string): string {
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


	public override saveOutfitAs(outfitName: string): string {
		const outfit = this.getOutfitView().snapshot();

		OutfitTracker.characterOutfits(this.characterKey).saveOutfit(outfitName, outfit);

		return `Saved "${outfitName}" outfit for ${this.displayName}.`;
	}

	public exportPresetToUser(outfitName: string): string {
		const outfit = this.getOutfitView().snapshot();

		OutfitTracker.userOutfits().saveOutfit(outfitName, outfit);

		return `Exported "${outfitName}" outfit to user.`;
	}

	public override deleteSavedOutfit(outfitName: string): string {
		const outfit = OutfitTracker.characterOutfits(this.characterKey).getSavedOutfit(outfitName);
		if (outfit === undefined) {
			return `[Outfit System] Preset "${outfitName}" not found.`;
		}

		OutfitTracker.characterOutfits(this.characterKey).deleteSavedOutfit(outfitName);

		return `Deleted "${outfitName}" outfit.`;
	}

	public override getSavedOutfits(): string[] {
		const outfits = OutfitTracker.characterOutfits(this.characterKey).getSavedOutfitNames();

		return outfits;
	}

	public override getOutfitCollection(): ICharacterOutfitCollectionView {
		return OutfitTracker.characterOutfits(this.characterKey);
	}


	protected override getFullSummaryTag(): { domain: string; openingTag: string; closingTag: string; } {
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


	public setFullSummaryTagResolver(fn: () => FullSummaryTag | undefined): void {
		this.resolveFullSummaryTag = fn;
		this.updateMacros();
	}
}