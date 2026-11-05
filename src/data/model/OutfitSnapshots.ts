import type { ContextSlot, SlotConditionMap, SlotKind, TextSlot, TraitAssignment, TraitSlot } from "./Outfit.js";
import { ImageRegistry } from "./OutfitGallery.js";
import { OutfitImageState } from "./OutfitImageState.js";
import { KeyedSlotPreset } from "./SlotPreset.js";

abstract class ContextSlotBase {
	public constructor(
		public readonly id: string
	) { }

	public abstract readonly resolved: boolean;
}

export abstract class ContextSlotState<
	T extends ContextSlot = ContextSlot
> extends ContextSlotBase {

	public readonly resolved = true as const;

	public readonly images: Readonly<Record<string, OutfitImageState | null>>;

	public constructor(
		public readonly raw: Readonly<T>,
		imageRegistry: ImageRegistry
	) {
		super(raw.id);

		const images: Record<string, OutfitImageState | null> = {};
		for (const [tag, image] of Object.entries(raw.images)) {
			const ref = imageRegistry.getImageRef(image.key);
			if (!ref) {
				console.error(`Missing blob for image key ${image.key}`);
				images[tag] = null;
				continue;
			}

			images[tag] = new OutfitImageState(tag, image, ref);
		}

		this.images = images;
	}

	public abstract get type(): T['type'];
	public abstract isEmpty(): boolean;

	public get kind(): SlotKind {
		return this.raw.kind;
	}

	public get enabled(): boolean {
		return this.raw.enabled;
	}

	public get activeImageTag(): string | null {
		return this.raw.activeImageTag;
	}

	public get equipped(): boolean {
		return this.raw.equipped;
	}

	public get conditions(): SlotConditionMap {
		return this.raw.conditions;
	}

	public get synced(): boolean {
		return this.raw.synced;
	}

	public isEnabled(): boolean {
		return this.enabled;
	}

	public isDisabled(): boolean {
		return !this.enabled;
	}



	public getActiveImageState(): OutfitImageState | null {
		if (this.activeImageTag === null) return null;
		return this.images[this.activeImageTag] ?? null;
	}

	public isActiveImageBlobMissing(): boolean {
		if (this.activeImageTag === null) return false;
		const image = this.images[this.activeImageTag];
		return image === null;
	}

	public getImageState(tag: string): OutfitImageState | null | undefined {
		return this.images[tag];
	}

	public hasImageState(tag: string): boolean {
		return tag in this.images;
	}

	public getImageStates(): OutfitImageState[] {
		return Object.values(this.images).filter(img => img !== null);
	}

	/**
	 * @returns Whether the slot has an OutfitImage record keyed by the SlotPreset
	 */
	public hasPreset(preset: KeyedSlotPreset): boolean {
		return preset.key in this.images;
	}
}

export class UnresolvedOutfitSlot extends ContextSlotBase {
	public readonly resolved = false as const;

	public constructor(id: string) {
		super(id);
	}
}



export class TextSlotState
	extends ContextSlotState<TextSlot> {

	public override get type(): 'text' {
		return this.raw.type;
	}

	public override isEmpty(): boolean {
		return this.value === 'None';
	}

	public get value(): string {
		return this.raw.value;
	}
}

export class TraitSlotState
	extends ContextSlotState<TraitSlot> {

	public override get type(): 'traits' {
		return this.raw.type;
	}

	public override isEmpty(): boolean {
		return this.traits.length === 0;
	}

	public get traits():
		ReadonlyArray<Readonly<TraitAssignment>> {
		return this.raw.traits;
	}
}

export interface OutfitSnapshot {
	slots: ContextSlot[];
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

