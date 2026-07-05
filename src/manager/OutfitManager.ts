import { getCurrentCharacterKey } from "../api/character-provider.js";
import { ChatOutfitStorage } from "../api/chat-metadata.js";
import * as SlotPresetsApi from "../api/internal/slot-preset.js";
import { OutfitSlot } from "../data/model/Outfit.js";
import { areOutfitSnapshotsEqual, OutfitSlotState } from "../data/model/OutfitSnapshots.js";
import { KeyedSlotPreset, KeyedSlotPresetWithImage } from "../data/model/SlotPreset.js";
import { OutfitTracker } from "../data/tracker.js";
import { MutableOutfitView } from "../data/view/MutableOutfitView.js";
import { IOutfitCollectionView } from "../data/view/OutfitCollectionView.js";
import { OutfitSnapshotsView } from "../data/view/OutfitSnapshotsView.js";
import { assertNever, formatAccessorySlotName, toSlotName } from "../shared.js";
import { promptOptions } from "../ui/prompt/prompt-options.js";
import { isSlotBlocked } from "../util/slot.js";
import { indentString, plural, toKebabCase } from "../util/StringHelper.js";
import { toSummaryKey } from "../util/SummaryHelper.js";
import { deleteGlobalVariable, getGlobalVariable, setGlobalVariable } from "./GlobalVarManager.js";
import { KindScope, OutfitMacroManager } from "./MacroManager.js";

type RenameSlotResult =
	| 'slot-not-found'
	| 'slot-already-exists'
	| 'slot-renamed';

export type LoadPresetResult =
	| 'not-found'
	| 'already-wearing'
	| 'success';

export abstract class OutfitManager {

	private updateContextTimeout: number | null = null;

	protected readonly summaryMacros: OutfitMacroManager;

	public constructor(
		public readonly saveSettings: () => void,
		macroOwner: string
	) {
		this.summaryMacros = new OutfitMacroManager(macroOwner, 'summary', 'outfit');
	}

	protected get outfit(): MutableOutfitView {
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

	public abstract updateSlotValue(slotId: string, newValue: string): string;

	public abstract getName(): string;

	public abstract isUser(): boolean;



	public getSnapshotsView(): OutfitSnapshotsView {
		return this.getOutfitCollection().getSnapshotView();
	}

	public getValue(slotId: string): string {
		return this.getOutfitView().values[slotId];
	}

	public abstract getSavedOutfits(): string[];

	public abstract deleteSavedOutfit(outfitName: string): string;

	public loadSavedOutfit(outfitName: string): LoadPresetResult {
		const collection = this.getOutfitCollection();
		const newOutfit = collection.getSavedOutfit(outfitName)?.snapshot();
		if (newOutfit === undefined) {
			return 'not-found';
		}

		const view = this.getOutfitView();
		const oldOutfit = view.snapshot();

		if (areOutfitSnapshotsEqual(oldOutfit, newOutfit)) {
			return 'already-wearing';
		}

		collection.loadOutfit(newOutfit);
		this.onActiveOutfitChanged();

		return 'success';
	}

	public abstract saveOutfitAs(outfitName: string): string;



	public buildSlotSummariesFromKind(kind: string): Record<string, string> {
		return this.outfit.mapSlots(
			s => this.formatSlotSummary(s),
			(s, arr) => s.kind === kind && s.enabled && !isSlotBlocked(s, arr)
		);
	}

	private formatSlotSummary(s: OutfitSlot): string {
		const chatNote = ChatOutfitStorage.getNote(this.getName(), s.id);
		const charNote = this.getOutfitCollection().getCharacterNote(getCurrentCharacterKey(), s.id);

		const parts: string[] = [];

		if (!s.equipped) {
			parts.push('Status: REMOVED');
		}

		parts.push(`${s.value}`);

		if (charNote) {
			parts.push(`Character context: ${charNote}`);
		}

		if (chatNote) {
			parts.push(`Chat context:\n${chatNote}`);
		}

		return parts.join(`\n\n`);
	}



	public getVisibleSlotMap(): Record<string, string> {
		return this.getOutfitView().getSlotValueMap((s, arr) => s.enabled && !isSlotBlocked(s, arr));
	}

	public abstract getVarName(namespace: string): string;

	/**
	 * Returns a macro that can be used in prompts to resolve the manager owner's name
	 */
	public abstract getNameMacro(): string;


	public clearSummaries(): void {
		this.summaryMacros.clear();
	}

	public updateMacrosDebounced(): void {
		if (this.updateContextTimeout !== null) {
			clearTimeout(this.updateContextTimeout);
		}

		this.updateContextTimeout = window.setTimeout(() => {
			this.updateContextTimeout = null;
			this.updateMacros();
		}, 100);
	}

	public updateMacros(): void {
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
				return `<${tag} name="${toType(k)}" state="${state}">`;
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
		this.reconcileSyncedSlots();
		this.updateMacros();
	}

	private reconcileSyncedSlots(): void {
		const view = this.getOutfitView();

		let changed = 0;
		for (const slot of view.slots) {
			if (!slot.synced) continue;

			const resolved = view.resolveSlot(slot.id);
			if (!resolved.resolved) continue;
			if (resolved.value === slot.value) continue;

			view.setValue(slot.id, resolved.value);
			changed++;
		}

		if (changed > 0) {
			toastr.info(`Synced ${changed} outfit slot${plural(changed)}.`);
			this.saveSettings();
		}
	}

	public deleteOutfitSlot(slotId: string): boolean {
		const view = this.getOutfitView();
		if (!view.hasSlotId(slotId)) return false;

		deleteGlobalVariable(this.getVarName(slotId));
		view.deleteSlot(slotId);

		this.updateMacros();
		return true;
	}

	protected setSlotValue(slotId: string, value: string): void {
		const view = this.getOutfitView();
		const slot = view.getSlotById(slotId);
		if (slot === undefined) return;

		view.setValue(slot.id, value);
		this.updateSlotContext(slotId);
	}

	/**
	 * Should be followed with a settings save and rerender before returning control to the user
	 */
	public async setSlotSync(slotId: string, synced: boolean): Promise<void> {
		const view = this.getOutfitView();
		const slot = view.getSlotById(slotId);
		if (!slot) return;

		if (!synced) {
			view.manipulate().setSync(slotId, false);
			return;
		}

		const before = view.resolveSlot(slotId);
		if (!before.resolved) return;

		const step = SlotPresetsApi.beginSaveSlotAsPresetAuto({
			slot: before
		});

		if (!step.oldPreset) {
			step.save();
		}
		else if (step.oldPreset.value !== before.value) {
			const choice = await promptOptions(
				'This image already has a different synced preset. What should happen?',
				['load-preset', 'use-current'],
				option => ({
					'load-preset': `Load preset: ${step.oldPreset!.value}`,
					'use-current': `Replace preset with:\n${before.value}`
				}[option])
			);

			switch (choice) {
				case null:
					return;
				case 'load-preset':
					this.loadSlotPreset(slotId, step.oldPreset);
					break;
				case 'use-current':
					step.save();
					break;
				default: assertNever(choice);
			}
		}

		view.manipulate().setSync(slotId, true);

		const after = view.resolveSlot(slotId);

		if (after.resolved && before.value !== after.value) {
			view.setValue(slotId, after.value);
			this.updateSlotContext(slotId);
		}
	}

	/**
	 * Updates summaries and global variables tied to slot id
	 */
	public updateSlotContext(
		slotId: string,
		{ debounceMacros = false }: { debounceMacros?: boolean; } = {}
	): void {
		const view = this.getOutfitView();
		const slot = view.resolveSlot(slotId);
		if (!slot.resolved) return;

		const varName = this.getVarName(slot.id);
		const prompt = this.formatSlotSummary(slot.raw);

		setGlobalVariable(varName, prompt);

		if (debounceMacros) {
			this.updateMacrosDebounced();
		}
		else {
			this.updateMacros();
		}
	}

	public getSlots(): readonly string[] {
		return this.getOutfitView().getSlotIds();
	}

	public getValues(): Readonly<Record<string, string>> {
		return this.getOutfitView().values;
	}

	public abstract getOutfitCollection(): IOutfitCollectionView;

	public getOutfitView(): MutableOutfitView {
		return this.getOutfitCollection().getOrCreateCurrentOutfit();
	}

	public renameSlot(oldSlotId: string, newSlotId: string): RenameSlotResult {
		const view = this.getOutfitView();

		const oldSlot = view.getSlotById(oldSlotId);
		if (!oldSlot) return 'slot-not-found';

		if (view.getSlotById(newSlotId)) return 'slot-already-exists';

		deleteGlobalVariable(this.getVarName(oldSlotId));

		view.renameSlot(oldSlotId, newSlotId);
		this.passCharacterNote(oldSlotId, newSlotId);
		this.passChatNote(oldSlotId, newSlotId);

		this.updateSlotContext(newSlotId);

		return 'slot-renamed';
	}

	private passCharacterNote(oldSlotId: string, newSlotId: string): void {
		const collection = this.getOutfitCollection();
		const character = getCurrentCharacterKey();
		if (!character) return;

		const note = collection.getCharacterNote(character, oldSlotId);
		if (!note) return;

		collection.deleteCharacterNote(character, oldSlotId);
		collection.setCharacterNote(character, newSlotId, note);
	}

	private passChatNote(oldSlotId: string, newSlotId: string): void {
		const character = getCurrentCharacterKey();
		if (!character) return;

		const note = ChatOutfitStorage.getNote(character, oldSlotId);
		if (note === null) return;

		ChatOutfitStorage.deleteNote(character, oldSlotId);
		ChatOutfitStorage.setNote(character, newSlotId, note);
	}



	public loadSlotPreset(slotId: string, preset: KeyedSlotPreset): void {
		if (SlotPresetsApi.hasImage(preset)) {
			this.setSlotImageFromSlotPreset(slotId, preset);
		}

		this.updateSlotValue(slotId, preset.value);
	}

	private setSlotImageFromSlotPreset(slotId: string, preset: KeyedSlotPresetWithImage): boolean {
		const attachImageResult = this.outfit.attachImage(slotId, preset.key, preset.image.key);
		switch (attachImageResult) {
			case 'slot-not-found':
			case 'blob-does-not-exist':
				throw new Error();
			case 'attached-image':
				break;
			default: assertNever(attachImageResult);
		}

		const resizeImageResult = this.outfit.resizeImage(slotId, preset.key, preset.image.width, preset.image.height);
		switch (resizeImageResult) {
			case 'slot-not-found':
			case 'tag-does-not-exist':
				throw new Error();
			case 'noop':
			case 'resized':
				break;
			default: assertNever(resizeImageResult);
		}

		const setActiveImageResult = this.outfit.setActiveImage(slotId, preset.key);
		switch (setActiveImageResult) {
			case 'slot-not-found':
			case 'image-does-not-exist':
				throw new Error();
			case 'image-already-active':
			case 'set-active-image':
				break;
			default: assertNever(setActiveImageResult);
		}

		return true;
	}
}