import { getSlotPresetRegistry } from "../../api/internal/slot-preset.js";
import { ContextSlot, Outfit, SlotKind, TextSlot } from "../model/Outfit.js";
import { OutfitSnapshot, UnresolvedOutfitSlot } from "../model/OutfitSnapshots.js";
import { OutfitTracker } from "../tracker.js";
import { ContextSlotView, contextualizeSlot, createSlotState } from "../util/slot.js";
import { MutableSlotView } from "./MutableSlotView.js";


export class OutfitView {

	protected slotView: MutableSlotView;

	public constructor(
		protected outfitName: string,
		outfit: Outfit
	) {
		this.slotView = new MutableSlotView(outfit.slots);
	}

	public get slots(): readonly Readonly<ContextSlot>[] {
		return this.slotView.slots;
	}

	public get values(): Readonly<Record<string, string>> {
		return Object.fromEntries(
			this.slots.map(slot => [
				slot.id,
				this.getValue(slot)
			])
		);
	}

	/**
	 * @deprecated
	 */
	public resolve(slotIds: readonly string[]): readonly ContextSlotView[] {
		return slotIds.map(id => this.resolveSlot(id));
	}

	public getSlotIds(): readonly string[] {
		return this.slots.map(s => s.id);
	}

	public getSlotKinds(): readonly SlotKind[] {
		return this.slotView.getKinds();
	}

	public getSlotsFromKind(kind: string): readonly Readonly<ContextSlot>[] {
		return this.slots.filter(s => s.kind === kind);
	}

	public mapSlots<T>(
		map: (slot: Readonly<ContextSlot>) => T,
		filter?: (
			slot: Readonly<ContextSlot>,
			slots: readonly Readonly<ContextSlot>[]
		) => boolean
	): Readonly<Record<string, T>> {
		const out: Record<string, T> = {};

		for (const slot of this.slots) {
			if (filter && !filter(slot, this.slots)) continue;
			out[slot.id] = map(slot);
		}

		return out;
	}

	public getSlotValueMap(
		filter?: (
			slot: Readonly<TextSlot>,
			slots: readonly Readonly<ContextSlot>[]
		) => boolean
	): Readonly<Record<string, string>> {
		const out: Record<string, string> = {};

		for (const slot of this.slots) {
			if (slot.type !== 'text') continue;
			if (filter && !filter(slot, this.slots)) continue;

			out[slot.id] = slot.value;
		}

		return out;
	}

	public hasSlotId(slotId: string): boolean {
		return this.slots.some(s => s.id === slotId);
	}

	public hasSlot(slot: ContextSlot): boolean {
		return this.hasSlotId(slot.id);
	}

	public isEmpty(): boolean {
		return this.slots.length === 0;
	}

	/**
	 * @returns a readonly of the outfit slot or `undefined` if the outfit does not have the slot
	 */
	public getSlotById(slotId: string): Readonly<ContextSlot> | undefined {
		return this.slotView.getSlotById(slotId);
	}

	public getIndexById(slotId: string): number | undefined {
		return this.slotView.getIndex(slotId);
	}

	public resolveSlot(slotId: string): ContextSlotView {
		const slot = this.getSlotById(slotId);

		if (!slot) {
			return new UnresolvedOutfitSlot(slotId);
		}

		return createSlotState(
			this.resolveSyncedSlot(slot),
			OutfitTracker.viewGallery()
		);
	}

	/**
	 * TODO: Add trait slots syncing functionality
	 */
	private resolveSyncedSlot(
		slot: Readonly<ContextSlot>
	): Readonly<ContextSlot> {
		if (slot.type !== 'text') return slot;
		if (!slot.synced || slot.activeImageTag === null) {
			return slot;
		}

		const preset = getSlotPresetRegistry().get(
			slot.activeImageTag
		);

		if (!preset || slot.value === preset.value) {
			return slot;
		}

		return {
			...slot,
			value: preset.value
		};
	}

	public getValue(slot: Pick<ContextSlot, 'id'>): string {
		const realSlot = this.getSlotById(slot.id);

		if (!realSlot) {
			throw new Error(
				`Slot ${slot.id} does not belong to outfit ${this.outfitName}`
			);
		}

		return contextualizeSlot(
			this.resolveSyncedSlot(realSlot),
			OutfitTracker.viewTraitRegistry().definitions
		);
	}

	public snapshot(): OutfitSnapshot {
		return {
			slots: this.slots.map(s => ({ ...s })),
			values: { ...this.values }
		};
	}
}
