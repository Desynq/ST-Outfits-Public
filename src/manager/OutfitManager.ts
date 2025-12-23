import { DEFAULT_SLOTS } from "../Constants.js";
import { OutfitTracker } from "../outfit/tracker.js";
import { MutableOutfitView } from "../outfit/view/MutableOutfitView.js";
import { Outfit, OutfitSlot } from "../outfit/model/Outfit.js";
import { deleteGlobalVariable, filterRecord, formatAccessorySlotName, toSlotName, getGlobalVariable, pruneRecord, serializeRecord, setGlobalVariable } from "../shared.js";
import { StringHelper } from "../util/StringHelper.js";

type RenameSlotResult =
	| 'slot-not-found'
	| 'slot-already-exists'
	| 'slot-renamed';

export abstract class OutfitManager {

	public constructor(
		private settingsSaver: Function
	) {
	}

	public saveSettings(): void {
		this.settingsSaver();
	}

	public exportPreset(outfitName: string, character: string): string {
		// Create preset data for all slots
		const outfit = this.getOutfitView().snapshot();

		OutfitTracker.characterOutfits(character).saveOutfit(outfitName, outfit);

		if (OutfitTracker.areSystemMessagesEnabled()) {
			return `Exported "${outfitName}" outfit to ${character}.`;
		}
		return '';
	}

	public abstract setOutfitItem(slotId: string, newValue: string): Promise<string>;

	public abstract getName(): string;

	public abstract isUser(): boolean;

	public async changeOutfitItem(slotId: string): Promise<string | null> {
		const currentValue = this.getValue(slotId);
		let newValue: string | null = currentValue;

		const choice = prompt(
			`${slotId}: ${currentValue}

Enter a new value.
Leave blank to remove.
Enter "Disabled" to dereference the slot from the character's list for outfit/accessories.
Cancel to keep the current value.`,
			currentValue
		);

		if (choice === null) return null;

		newValue = choice.trim() === ""
			? "None"
			: choice;

		if (newValue !== currentValue) {
			return this.setOutfitItem(slotId, newValue);
		}
		return null;
	}

	public getValue(slotId: string): string {
		return this.getOutfitView().values[slotId];
	}

	public abstract getPresets(): string[];

	public abstract deletePreset(outfitName: string): string;

	public abstract loadPreset(outfitName: string): Promise<string>;

	public abstract savePreset(outfitName: string): Promise<string>;



	public getVisibleRecordsByType(kind: string): Record<string, string> {
		return this.getOutfitView().getSlotRecords(s => s.kind === kind && s.enabled);
	}

	public abstract getVarName(namespace: string): string;

	protected updateSummaries(): void {
		let fullSummary = '<outfit>';
		for (const kind of this.getOutfitView().getSlotKinds()) {
			const value = serializeRecord(
				this.getVisibleRecordsByType(kind),
				kind === 'accessory' ? formatAccessorySlotName : toSlotName,
				kind
			);

			this.setSummary(kind + '_summary', value);
			if (value !== '') {
				fullSummary += `\n${StringHelper.indent(value)}`;
			}
		}

		fullSummary += '\n</outfit>';
		this.setSummary('summary', fullSummary);
	}

	public getSummary(namespace: string): string {
		const varName = this.getVarName(namespace);
		return getGlobalVariable(varName);
	}

	public setSummary(namespace: string, value: string): void {
		const varName = this.getVarName(namespace);
		setGlobalVariable(varName, value);
	}

	public initializeOutfit(): void {
		const view = this.getOutfitView();
		this.onActiveOutfitChanged();

		for (const slotId of view.getSlotIds()) {
			const varName = this.getVarName(slotId);
			const slotValue = getGlobalVariable(varName);

			if (slotValue === 'None') {
				// optimization to avoid deeper querying/defaults when global variable does not exist
				setGlobalVariable(varName, 'None');
			}
		}
	}

	protected onActiveOutfitChanged(): void {
		this.updateSummaries();
	}

	public deleteOutfitSlot(slotId: string): boolean {
		const view = this.getOutfitView();
		if (!view.hasSlotId(slotId)) return false;

		deleteGlobalVariable(this.getVarName(slotId));
		view.deleteSlot(slotId);

		this.updateSummaries();
		return true;
	}

	protected applyOutfitValue(slotId: string, value: string): void {
		const view = this.getOutfitView();
		const slot = view.getSlotById(slotId);
		if (slot === undefined) return;

		view.setValue(slot.id, value);
		this.updateOutfitValue(slotId);
	}

	public updateOutfitValue(slotId: string): void {
		const view = this.getOutfitView();
		const slot = view.getResolvedSlot(slotId);
		if (!slot.resolved) return;

		const varName = this.getVarName(slotId);
		setGlobalVariable(varName, slot.value);
		this.updateSummaries();
	}

	public getSlots(): readonly string[] {
		return this.getOutfitView().getSlotIds();
	}

	public getValues(): Readonly<Record<string, string>> {
		return this.getOutfitView().values;
	}

	public abstract getOutfitView(): MutableOutfitView;

	public renameSlot(slotId: string, newId: string): RenameSlotResult {
		const view = this.getOutfitView();

		const oldSlot = view.getSlotById(slotId);
		if (!oldSlot) return 'slot-not-found';

		if (view.getSlotById(newId)) return 'slot-already-exists';

		// Capture everything BEFORE mutation
		const oldIndex = view.getIndexById(oldSlot.id)!;
		const value = oldSlot.value;

		this.deleteOutfitSlot(oldSlot.id);

		view.addSlot(newId, oldSlot.kind);
		view.shiftSlotByIndex(
			view.slots.length - 1,
			oldIndex
		);

		this.setOutfitItem(newId, value);

		return 'slot-renamed';
	}
}