import { Outfit, OutfitSlot, SlotKind } from "../model/Outfit.js";
import { OutfitSlotView, UnresolvedOutfitSlot, OutfitSlotState, OutfitSnapshot } from "../model/OutfitSnapshots.js";
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
		return slotIds.map(id => this.getResolvedSlot(id));
	}

	public getSlotIds(): readonly string[] {
		return this.slots.map(s => s.id);
	}

	public getSlotKinds(): readonly SlotKind[] {
		return this.slotView.getKinds();
	}

	public getClothingSlotIds(): readonly string[] {
		return this.slots.filter(s => s.kind === 'clothing').map(s => s.id);
	}

	public getAccessorySlotIds(): readonly string[] {
		return this.slots.filter(s => s.kind === 'accessory').map(s => s.id);
	}

	public getSlotRecords(filter?: (s: Readonly<OutfitSlot>) => boolean): Readonly<Record<string, string>> {
		const out: Record<string, string> = {};

		for (const s of this.slots) {
			if (filter && !filter(s)) continue;
			out[s.id] = s.value;
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
	 * @returns a shallow copy of the outfit slot or `undefined` if the outfit does not have the slot
	 */
	public getSlotById(slotId: string): Readonly<OutfitSlot> | undefined {
		return this.slotView.getSlotById(slotId);
	}

	public getIndexById(slotId: string): number | undefined {
		return this.slotView.getIndex(slotId);
	}

	/**
	 * @deprecated
	 */
	public getResolvedSlot(slotId: string): OutfitSlotView {
		const slot = this.getSlotById(slotId);
		return !slot
			? new UnresolvedOutfitSlot(slotId)
			: OutfitSlotState.fromSlot(slot, slot.value);
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
