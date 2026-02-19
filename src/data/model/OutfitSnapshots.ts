import { ImageRegistry } from "../view/OutfitImagesView.js";
import { OutfitSlot, SlotKind } from "./Outfit.js";
import { OutfitImageState } from "./OutfitImageState.js";
import { KeyedSlotPreset } from "./SlotPreset.js";


abstract class OutfitSlotBase {
	public constructor(
		public readonly id: string
	) { }

	public abstract readonly resolved: boolean;
}

export class OutfitSlotState extends OutfitSlotBase {

	public readonly resolved = true as const;

	private constructor(
		id: string,
		public readonly kind: SlotKind,
		public readonly value: string,
		public readonly enabled: boolean,
		// tag: OutfitImageState
		private readonly images: Record<string, OutfitImageState>,
		public readonly activeImageTag: string | null
	) {
		super(id);
	}

	public static fromSlot(
		slot: Readonly<OutfitSlot>,
		imageRegistry: ImageRegistry
	): OutfitSlotState {
		const resolvedImages: Record<string, OutfitImageState> = {};

		for (const [tag, image] of Object.entries(slot.images)) {
			const blob = imageRegistry.getImage(image.key);
			if (!blob) {
				throw new Error(`Missing blob for image key ${image.key}`);
			}

			resolvedImages[tag] = new OutfitImageState(tag, image, blob);
		}

		if (slot.activeImageTag !== null && !resolvedImages[slot.activeImageTag]) {
			throw new Error(`Missing image for active image tag`);
		}

		return new OutfitSlotState(
			slot.id,
			slot.kind,
			slot.value,
			slot.enabled,
			resolvedImages,
			slot.activeImageTag
		);
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

	public getActiveImageState(): OutfitImageState | null {
		if (this.activeImageTag === null) return null;
		return this.images[this.activeImageTag];
	}

	public getImageState(tag: string): OutfitImageState | undefined {
		return this.images[tag];
	}

	public hasImageState(tag: string): boolean {
		return tag in this.images;
	}

	public getImageStates(): OutfitImageState[] {
		return Object.values(this.images);
	}

	/**
	 * @returns Whether the slot has an OutfitImage record keyed by the SlotPreset
	 */
	public hasPreset(preset: KeyedSlotPreset): boolean {
		return preset.key in this.images;
	}

	public isPreset(preset: KeyedSlotPreset): boolean {
		const image = this.images[preset.key];
		if (!image) return false;
		if (image.image.width !== preset.imageWidth) return false;
		if (image.image.height !== preset.imageHeight) return false;
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

