import { OutfitImage, OutfitSlot, SlotKind } from "./Outfit.js";
import { KeyedSlotPreset } from "./SlotPreset.js";


abstract class OutfitSlotBase {
	public constructor(
		public readonly id: string
	) { }

	public abstract readonly resolved: boolean;
}

export class OutfitSlotState extends OutfitSlotBase {

	public readonly resolved = true as const;

	public constructor(
		id: string,
		public readonly kind: SlotKind,
		public readonly value: string,
		public readonly enabled: boolean,
		public readonly images: Record<string, OutfitImage>,
		public readonly activeImageTag: string | null
	) {
		super(id);
	}

	public static fromSlot(slot: Readonly<OutfitSlot>, value: string): OutfitSlotState {
		return new OutfitSlotState(slot.id, slot.kind, value, slot.enabled, slot.images, slot.activeImageTag);
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

	/**
	 * @returns Whether the slot has an OutfitImage record keyed by the SlotPreset
	 */
	public hasPreset(preset: KeyedSlotPreset): boolean {
		return this.images[preset.key] !== undefined;
	}

	public isPreset(preset: KeyedSlotPreset): boolean {
		const image = this.images[preset.key];
		if (!image) return false;
		if (image.width !== preset.imageWidth) return false;
		if (image.height !== preset.imageHeight) return false;
		if (this.value !== preset.value) return false;

		return true;
	}
}

export class UnresolvedOutfitSlot extends OutfitSlotBase {
	readonly resolved = false as const;

	public constructor(id: string) {
		super(id);
	}
}

export type OutfitSlotView = OutfitSlotState | UnresolvedOutfitSlot;

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

