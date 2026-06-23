import { getSlotPresetRegistry } from "../../api/internal/slot-preset.js";
import { Outfit, OutfitSlot, SlotKind } from "../model/Outfit.js";
import { OutfitSlotView, UnresolvedOutfitSlot, OutfitSlotState, OutfitSnapshot } from "../model/OutfitSnapshots.js";
import { OutfitTracker } from "../tracker.js";
import { MutableSlotView } from "./MutableSlotView.js";


export class OutfitView {

	protected slotView: MutableSlotView;

	public constructor(
		protected outfitName: string,
		outfit: Outfit
	) {
		this.slotView = new MutableSlotView(outfit.slots);
	}

	public get slots(): readonly Readonly<OutfitSlot>[] {
		return this.slotView.slots;
	}

	public get values(): Readonly<Record<string, string>> {
		return Object.fromEntries(
			this.slots
				.map(s => [s.id, s.value])
		);
	}

	/**
	 * @deprecated
	 */
	public resolve(slotIds: readonly string[]): readonly OutfitSlotView[] {
		return slotIds.map(id => this.resolveSlot(id));
	}

	public getSlotIds(): readonly string[] {
		return this.slots.map(s => s.id);
	}

	public getSlotKinds(): readonly SlotKind[] {
		return this.slotView.getKinds();
	}

	public getSlotsFromKind(kind: string): readonly Readonly<OutfitSlot>[] {
		return this.slots.filter(s => s.kind === kind);
	}

	public mapSlots<T>(
		map: (slot: Readonly<OutfitSlot>) => T,
		filter?: (slot: Readonly<OutfitSlot>, slots: readonly Readonly<OutfitSlot>[]) => boolean
	): Readonly<Record<OutfitSlot['id'], T>> {
		const out: Record<OutfitSlot['id'], T> = {};

		for (const slot of this.slots) {
			if (filter && !filter(slot, this.slots)) continue;
			out[slot.id] = map(slot);
		}

		return out;
	}

	public getSlotValueMap(
		filter?: (slot: Readonly<OutfitSlot>, slots: readonly Readonly<OutfitSlot>[]) => boolean
	): Readonly<Record<string, string>> {
		const out: Record<string, string> = {};

		for (const slot of this.slots) {
			if (filter && !filter(slot, this.slots)) continue;
			out[slot.id] = slot.value;
		}

		return out;
	}

	public hasSlotId(slotId: string): boolean {
		return this.slots.some(s => s.id === slotId);
	}

	public hasSlot(slot: OutfitSlot): boolean {
		return this.hasSlotId(slot.id);
	}

	public isEmpty(): boolean {
		return this.slots.length === 0;
	}

	/**
	 * @returns a readonly of the outfit slot or `undefined` if the outfit does not have the slot
	 */
	public getSlotById(slotId: string): Readonly<OutfitSlot> | undefined {
		return this.slotView.getSlotById(slotId);
	}

	public getIndexById(slotId: string): number | undefined {
		return this.slotView.getIndex(slotId);
	}

	public resolveSlot(slotId: string): OutfitSlotView {
		const slot = this.getSlotById(slotId);
		if (!slot) return new UnresolvedOutfitSlot(slotId);

		return new OutfitSlotState(
			this.resolveSyncedSlot(slot),
			OutfitTracker.viewGallery()
		);
	}

	private resolveSyncedSlot(slot: Readonly<OutfitSlot>): Readonly<OutfitSlot> {
		if (!slot.synced) return slot;
		if (slot.activeImageTag === null) return slot;

		const preset = getSlotPresetRegistry().get(slot.activeImageTag);
		if (!preset) return slot;

		if (slot.value === preset.value) return slot; // already synced

		return {
			...slot,
			value: preset.value
		};
	}

	public getValue(slot: Pick<OutfitSlot, 'id'>): string {
		const realSlot = this.slotView.getSlotById(slot.id);
		if (!realSlot) {
			throw new Error(`Slot ${slot.id} does not belong to outfit ${this.outfitName}`);
		}
		return realSlot.value;
	}

	public snapshot(): OutfitSnapshot {
		return {
			slots: this.slots.map(s => ({ ...s })),
			values: { ...this.values }
		};
	}
}
