import { OutfitSlot, SlotKind } from "./Outfit.js";


abstract class OutfitSlotBase {
	public constructor(
		public readonly id: string
	) { }

	abstract readonly resolved: boolean;
}

export class ResolvedOutfitSlot extends OutfitSlotBase {

	readonly resolved = true as const;

	public constructor(
		id: string,
		public readonly kind: SlotKind,
		public readonly value: string,
		public readonly enabled: boolean
	) {
		super(id);
	}

	public static fromSlot(slot: Readonly<OutfitSlot>, value: string): ResolvedOutfitSlot {
		return new ResolvedOutfitSlot(slot.id, slot.kind, value, slot.enabled);
	}

	public isEnabled(): boolean {
		return this.enabled;
	}

	public isDisabled(): boolean {
		return !this.enabled;
	}

	public isEmpty(): boolean {
		return this.value === 'None';
	}
}

export class UnresolvedOutfitSlot extends OutfitSlotBase {
	readonly resolved = false as const;

	public constructor(id: string) {
		super(id);
	}
}

export type OutfitSlotView = ResolvedOutfitSlot | UnresolvedOutfitSlot;

export interface OutfitSnapshot {
	slots: OutfitSlot[];
	values: Record<string, string>;
}



export function areOutfitSnapshotsEqual(
	a: OutfitSnapshot,
	b: OutfitSnapshot
): boolean {
	// compare slots (id + kind + order)
	if (a.slots.length !== b.slots.length) return false;

	for (let i = 0; i < a.slots.length; i++) {
		const sa = a.slots[i];
		const sb = b.slots[i];
		if (sa.id !== sb.id || sa.kind !== sb.kind) return false;
	}

	// compare values
	const aKeys = Object.keys(a.values);
	const bKeys = Object.keys(b.values);

	if (aKeys.length !== bKeys.length) return false;

	for (const key of aKeys) {
		if (a.values[key] !== b.values[key]) return false;
	}

	return true;
}

