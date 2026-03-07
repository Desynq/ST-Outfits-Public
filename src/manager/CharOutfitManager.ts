import { areOutfitSnapshotsEqual } from "../data/model/OutfitSnapshots.js";
import { OutfitTracker } from "../data/tracker.js";
import { IOutfitCollectionView } from "../data/view/OutfitCollectionView.js";
import { FullSummaryTag } from "../data/view/PanelViews.js";
import { toCamelCase, toPascalCase } from "../util/StringHelper.js";
import { OutfitManager } from "./OutfitManager.js";



export class CharOutfitManager extends OutfitManager {

	private resolveFullSummaryTag?: () => FullSummaryTag | undefined;

	public constructor(
		saveSettings: () => void,
		public readonly character: string,
	) {
		super(saveSettings, toPascalCase(character));
		this.onActiveOutfitChanged();
	}

	public override getName(): string {
		return this.character;
	}

	public override isUser(): boolean {
		return false;
	}

	public override getNameMacro(): string {
		return this.character;
	}

	public override getVarName(namespace: string): string {
		return `${this.character.replace(/\s+/g, ' ')}_${namespace}`;
	}

	public override async setOutfitItem(slotId: string, value: string): Promise<string> {
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


	public override async savePreset(outfitName: string): Promise<string> {
		const outfit = this.getOutfitView().snapshot();

		OutfitTracker.characterOutfits(this.character).saveOutfit(outfitName, outfit);

		return `Saved "${outfitName}" outfit for ${this.character}.`;
	}

	public exportPresetToUser(outfitName: string): string {
		const outfit = this.getOutfitView().snapshot();

		OutfitTracker.userOutfits().saveOutfit(outfitName, outfit);

		return `Exported "${outfitName}" outfit to user.`;
	}

	public override async loadPreset(outfitName: string): Promise<string> {
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

	public override deletePreset(outfitName: string): string {
		const outfit = OutfitTracker.characterOutfits(this.character).getSavedOutfit(outfitName);
		if (outfit === undefined) {
			return `[Outfit System] Preset "${outfitName}" not found.`;
		}

		OutfitTracker.characterOutfits(this.character).deleteSavedOutfit(outfitName);

		return `Deleted "${outfitName}" outfit.`;
	}

	public override getPresets(): string[] {
		const outfits = OutfitTracker.characterOutfits(this.character).getSavedOutfitNames();

		return outfits;
	}

	public override getOutfitCollection(): IOutfitCollectionView {
		return OutfitTracker.characterOutfits(this.character);
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
		this.updateSummaries();
	}
}