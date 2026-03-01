import { OutfitSlot } from "../data/model/Outfit.js";
import { OutfitTracker } from "../data/tracker.js";
import { MutableOutfitView } from "../data/view/MutableOutfitView.js";
import { IOutfitCollectionView } from "../data/view/OutfitCollectionView.js";
import { OutfitSnapshotsView } from "../data/view/OutfitSnapshotsView.js";
import { formatAccessorySlotName, toSlotName } from "../shared.js";
import { indentString, toKebabCase } from "../util/StringHelper.js";
import { toSummaryKey } from "../util/SummaryHelper.js";
import { deleteGlobalVariable, getGlobalVariable, setGlobalVariable } from "./GlobalVarManager.js";
import { KindScope, OutfitMacroManager } from "./MacroManager.js";

type RenameSlotResult =
	| 'slot-not-found'
	| 'slot-already-exists'
	| 'slot-renamed';

export abstract class OutfitManager {

	protected readonly summaryMacros: OutfitMacroManager;

	public constructor(
		public readonly saveSettings: Function,
		macroOwner: string
	) {
		this.summaryMacros = new OutfitMacroManager(macroOwner, 'summary', 'outfit');
	}

	protected get outfit() {
		return this.getOutfitView();
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



	public getSnapshotsView(): OutfitSnapshotsView {
		return this.getOutfitCollection().getSnapshotView();
	}




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



	public buildSlotSummariesFromKind(kind: string): Record<string, string> {
		return this.outfit.mapSlots(
			s => this.formatSlotSummary(s),
			s => s.kind === kind && s.enabled
		);
	}

	private formatSlotSummary(s: OutfitSlot): string {
		return (!s.equipped ? '((REMOVED))\n' : '') + s.value;
	}



	public getVisibleSlotMap(): Record<string, string> {
		return this.getOutfitView().getSlotValueMap(s => s.enabled);
	}

	public abstract getVarName(namespace: string): string;

	/**
	 * Returns a macro that can be used in prompts to resolve the manager owner's name
	 */
	public abstract getNameMacro(): string;


	public clearSummaries(): void {
		this.summaryMacros.clear();
	}

	public updateSummaries(): void {
		const domain = this.getFullSummaryTag().domain;
		const domainChanged = this.summaryMacros.setDomain(domain);

		const kindSummaries = new Map<string, string>();
		const fullSummary = this.createOutfitSummary(kindSummaries);

		const namespace = 'summary';
		const oldSummary = this.getSummary(namespace);

		if (!domainChanged && fullSummary === oldSummary) return;

		console.log('Updating summaries for', this.getName());

		if (!domainChanged) {
			this.summaryMacros.clear();
		}

		for (const [k, v] of kindSummaries) {
			this.updateKindSummary(k, v);
		}

		this.setSummary('*', fullSummary);
	}

	private updateKindSummary(kind: string, value: string): void {
		const namespace = toSummaryKey(kind);
		const oldValue = this.getSummary(namespace);
		if (value === oldValue) return;

		this.setSummary(namespace, value);
	}

	protected getFullSummaryTag(): { domain: string, openingTag: string; closingTag: string; } {
		return {
			domain: 'outfit',
			openingTag: `<outfit character="${this.getNameMacro()}">`,
			closingTag: '</outfit>'
		};
	}

	private buildSlotKindSummary(
		record: Record<string, string>,
		openingTag: (k: string, v: string) => string,
		closingTag: (k: string, v: string) => string,
	): string {
		return Object.entries(record)
			.map(([k, v]) => {
				const ot = openingTag(k, v);
				const tc = indentString(v);
				const ct = closingTag(k, v);
				return `${ot}\n${tc}\n${ct}`;
			})
			.join("\n\n");
	}

	public createOutfitSummary(out?: Map<string, string>): string {
		const { openingTag, closingTag } = this.getFullSummaryTag();
		let fullSummary = openingTag;
		let isFirst = true;

		for (const kind of this.outfit.getSlotKinds()) {
			const tag = toKebabCase(kind);
			const toType = (k: string): string => toKebabCase(kind === 'accessory'
				? formatAccessorySlotName(k)
				: toSlotName(k)
			);

			const openingTag = (k: string): string => {
				const s = this.outfit.getSlotById(k);
				if (s === undefined) throw new Error();
				const state = s.equipped ? 'present' : 'absent';
				return `<${tag} type="${toType(k)}" state="${state}">`;
			};

			const kindSummary = this.buildSlotKindSummary(
				this.buildSlotSummariesFromKind(kind),
				openingTag,
				() => `</${tag}>`
			);

			out?.set(kind, kindSummary);

			if (kindSummary !== '') {
				fullSummary += isFirst
					? `\n${indentString(kindSummary)}`
					: `\n\n${indentString(kindSummary)}`;

				isFirst = false;
			}
		}

		fullSummary += `\n${closingTag}`;
		return fullSummary;
	}

	public getSummaryKey(scope: KindScope): string {
		return this.summaryMacros.asKey(scope);
	}

	public getSummary(scope: KindScope): string | undefined {
		return this.summaryMacros.get(scope);
	}

	public setSummary(scope: KindScope, value: string): void {
		this.summaryMacros.set(scope, value);
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
		const slot = view.resolveSlot(slotId);
		if (!slot.resolved) return;

		const varName = this.getVarName(slot.id);
		const prompt = this.formatSlotSummary(slot.raw);

		setGlobalVariable(varName, prompt);
		this.updateSummaries();
	}

	public getSlots(): readonly string[] {
		return this.getOutfitView().getSlotIds();
	}

	public getValues(): Readonly<Record<string, string>> {
		return this.getOutfitView().values;
	}

	public abstract getOutfitCollection(): IOutfitCollectionView;

	public getOutfitView(): MutableOutfitView {
		return this.getOutfitCollection().getOrCreateAutosaved();
	}

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