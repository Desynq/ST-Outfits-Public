import { ContextSlot, SlotCondition, SlotConditionMapMode, SlotKind } from "../model/Outfit.js";
import { OutfitTracker } from "../tracker.js";
import { createSlot } from "../util/slot.js";


export type MoveSlotResult =
	| 'slot-not-found'
	| 'index-out-of-bounds'
	| 'noop'
	| 'moved';

export type RenameSlotResult =
	| 'slot-not-found'
	| 'slot-already-exists'
	| 'renamed';

export type AddSlotResult =
	| 'slot-already-exists'
	| 'added';

export type RenameKindResult =
	| 'old-kind-not-found'
	| 'new-kind-already-exists'
	| 'renamed';

export type MoveToKindResult =
	| 'slot-not-found'
	| 'noop'
	| 'moved';

export type SetActiveImageResult =
	| 'slot-not-found'
	| 'image-does-not-exist'
	| 'image-already-active'
	| 'set-active-image';

export type AttachImageResult =
	| 'slot-not-found'
	| 'blob-does-not-exist'
	| 'attached-image';

export type DeleteImageResponse =
	| { status: 'slot-not-found'; }
	| { status: 'image-does-not-exist'; }
	| { status: 'deleted-image'; blobKey: string; };

export type ToggleImageResult =
	| 'slot-not-found'
	| 'tag-does-not-exist'
	| 'already-set-to-state'
	| 'toggled';

export type ResizeImageResult =
	| 'slot-not-found'
	| 'tag-does-not-exist'
	| 'noop'
	| 'resized';

export interface ISlotManipulator {
	setConditions(id: string, type: SlotConditionMapMode, conditions: SlotCondition[]): boolean;
	setSync(id: string, sync: boolean): boolean;
}

export class MutableSlotView implements ISlotManipulator {

	private readonly _slots: ContextSlot[];
	private indexById: Record<string, number> = {};

	public constructor(slots: ContextSlot[]) {
		this._slots = slots;
		this.rebuildIndex();
	}

	public rebuildIndex(): void {
		this.indexById = {};

		for (let i = 0; i < this._slots.length; i++) {
			const id = this._slots[i].id;
			if (id in this.indexById) {
				throw new Error(`Duplicate slot id: ${id}`);
			}
			this.indexById[id] = i;
		}
	}

	public get slots(): readonly Readonly<ContextSlot>[] {
		return this._slots;
	}

	public getKinds(): readonly SlotKind[] {
		return [...new Set(this.slots.map(s => s.kind))];
	}

	private getMutableSlotById(id: string): ContextSlot | undefined {
		const i = this.indexById[id];
		return i === undefined ? undefined : this._slots[i];
	}



	public getSlotById<T extends ContextSlot['type']>(
		id: string,
		type: T
	): Readonly<Extract<ContextSlot, { type: T; }>> | undefined;

	public getSlotById(
		id: string
	): Readonly<ContextSlot> | undefined;

	public getSlotById(
		id: string,
		type?: ContextSlot['type']
	): Readonly<ContextSlot> | undefined {
		const slot = this.getMutableSlotById(id);

		if (type && slot?.type !== type) return undefined;

		return slot;
	}



	public getSlotAt(index: number): Readonly<ContextSlot> | undefined {
		if (index < 0 || index >= this.slots.length) return undefined;

		return this.slots[index];
	}

	public getIndex(id: string): number | undefined {
		return this.indexById[id];
	}

	/* -------------------------------- Mutation -------------------------------- */

	public setValue(id: string, value: string): boolean {
		const slot = this.getMutableSlotById(id);

		if (slot?.type !== 'text') return false;

		slot.value = value;
		return true;
	}

	public addTrait(id: string, traitId: string): boolean {
		const slot = this.getMutableSlotById(id);

		if (slot?.type !== 'traits') return false;

		if (slot.traits.some(t => t.traitId === traitId)) {
			return false;
		}

		slot.traits.push({ traitId });
		return true;
	}

	public removeTrait(id: string, traitId: string): boolean {
		const slot = this.getMutableSlotById(id);

		if (slot?.type !== 'traits') return false;

		const index = slot.traits.findIndex(t => t.traitId === traitId);
		if (index === -1) return false;

		slot.traits.splice(index, 1);
		return true;
	}

	public moveToKind(id: string, kind: SlotKind): MoveToKindResult {
		const i = this.indexById[id];
		if (i === undefined) return 'slot-not-found';

		const slot = this._slots[i];
		if (slot.kind === kind) return 'noop';

		slot.kind = kind;
		const result = this.moveIndex(i, this._slots.length);
		switch (result) {
			case 'moved':
				return 'moved';
			default:
				throw new Error(
					`Invariant violation: moveIndex failed during moveToKind (result=${result})`
				);
		}
	}

	public setEnabled(id: string, enabled: boolean): boolean {
		const i = this.indexById[id];
		if (i === undefined) return false;

		this._slots[i].enabled = enabled;
		return true;
	}

	public setEquipped(id: string, equipped: boolean): boolean {
		const slot = this.getMutableSlotById(id);
		if (slot === undefined) return false;

		slot.equipped = equipped;
		return true;
	}

	public setConditions(id: string, type: SlotConditionMapMode, conditions: SlotCondition[]): boolean {
		const slot = this.getMutableSlotById(id);
		if (slot === undefined) return false;

		slot.conditions.mode = type;
		slot.conditions.items = conditions;
		return true;
	}

	private renameCondition(oldId: string, newId: string): void {
		for (const slot of this._slots) {
			for (const condition of slot.conditions.items) {
				if (condition.id === oldId) {
					condition.id = newId;
				}
			}
		}
	}



	public attachImage(id: string, tag: string, refKey: string): AttachImageResult {
		const i = this.indexById[id];
		if (i === undefined) return 'slot-not-found';

		const ref = OutfitTracker.viewGallery().getImageRef(refKey);
		if (ref === undefined) return 'blob-does-not-exist';

		this._slots[i].images[tag] = {
			key: refKey,
			width: ref.width,
			height: ref.height,
			hidden: false
		};

		return 'attached-image';
	}

	public deleteImage(id: string, tag: string): DeleteImageResponse {
		const i = this.indexById[id];
		if (i === undefined) return {
			status: 'slot-not-found'
		};

		const slot = this._slots[i];

		const image = slot.images[tag];
		if (image === undefined) return {
			status: 'image-does-not-exist'
		};

		if (slot.activeImageTag === tag) slot.activeImageTag = null;

		const blobKey = image.key;

		delete slot.images[tag];

		return {
			status: 'deleted-image',
			blobKey
		};
	}

	public setActiveImage(id: string, tag: string): SetActiveImageResult {
		const slot = this.getMutableSlotById(id);
		if (!slot) return 'slot-not-found';

		if (slot.activeImageTag === tag) return 'image-already-active';

		slot.activeImageTag = tag;

		const image = slot.images[tag];
		if (!image) return 'image-does-not-exist';

		return 'set-active-image';
	}

	public toggleImage(id: string, tag: string, hidden: boolean): ToggleImageResult {
		const slot = this.getMutableSlotById(id);
		if (!slot) return 'slot-not-found';

		const image = slot.images[tag];
		if (!image) return 'tag-does-not-exist';

		if (image.hidden === hidden) return 'already-set-to-state';

		image.hidden = hidden;
		return 'toggled';
	}

	public resizeImage(id: string, tag: string, width: number, height: number): ResizeImageResult {
		const slot = this.getMutableSlotById(id);
		if (!slot) return 'slot-not-found';

		const image = slot.images[tag];
		if (!image) return 'tag-does-not-exist';

		if (image.width === width && image.height === height) return 'noop';

		image.width = width;
		image.height = height;
		return 'resized';
	}



	public setSync(id: string, sync: boolean): boolean {
		const slot = this.getMutableSlotById(id);
		if (slot === undefined) return false;

		slot.synced = sync;
		return true;
	}



	public addSlot(
		id: string,
		kind: SlotKind,
		type: ContextSlot['type'] = 'text'
	): AddSlotResult {
		if (this.getSlotById(id)) {
			return 'slot-already-exists';
		}

		const slot = createSlot({ id, kind, type });

		this._slots.push(slot);
		this.indexById[id] = this._slots.length - 1;

		return 'added';
	}

	public deleteSlot(id: string): boolean {
		const i = this.indexById[id];
		if (i === undefined) return false;

		this._slots.splice(i, 1);
		this.rebuildIndex();
		return true;
	}

	public moveIndex(sourceIndex: number, targetIndex: number, reIndex: boolean = true): MoveSlotResult {
		const slots = this._slots;

		if (sourceIndex < 0 || sourceIndex >= slots.length) {
			return 'slot-not-found';
		}

		if (targetIndex < 0 || targetIndex > slots.length) {
			return 'index-out-of-bounds';
		}

		if (sourceIndex === targetIndex) return 'noop';

		const [slot] = slots.splice(sourceIndex, 1);
		slots.splice(targetIndex, 0, slot);

		if (reIndex) this.rebuildIndex();

		return 'moved';
	}

	public move(id: string, targetIndex: number): MoveSlotResult {
		const i = this.indexById[id];
		if (i === undefined) return 'slot-not-found';

		return this.moveIndex(i, targetIndex);
	}

	public renameSlot(oldId: string, newId: string): RenameSlotResult {
		const i = this.indexById[oldId];
		if (i === undefined) return 'slot-not-found';

		const duplicate = this.indexById[newId];
		if (duplicate !== undefined) return 'slot-already-exists';

		this._slots[i].id = newId;

		delete this.indexById[oldId];
		this.indexById[newId] = i;

		this.renameCondition(oldId, newId);

		return 'renamed';
	}



	public sortByKind(kindOrder?: readonly SlotKind[]): void {
		const buckets = new Map<SlotKind, ContextSlot[]>();

		for (const slot of this._slots) {
			let bucket = buckets.get(slot.kind);
			if (!bucket) {
				bucket = [];
				buckets.set(slot.kind, bucket);
			}

			bucket.push(slot);
		}

		let i = 0;

		if (kindOrder) {
			for (const kind of kindOrder) {
				const bucket = buckets.get(kind);
				if (!bucket) continue;

				for (const slot of bucket) {
					this._slots[i++] = slot;
				}

				buckets.delete(kind);
			}
		}

		for (const bucket of buckets.values()) {
			for (const slot of bucket) {
				this._slots[i++] = slot;
			}
		}

		this.rebuildIndex();
	}

	public renameKind(oldKind: string, newKind: string): RenameKindResult {
		const kinds = this.getKinds();
		let exists: boolean = false;
		for (const k of kinds) {
			if (k === newKind) return 'new-kind-already-exists';

			if (k === oldKind) exists = true;
		}

		if (!exists) return 'old-kind-not-found';

		for (const slot of this._slots) {
			if (slot.kind !== oldKind) continue;
			slot.kind = newKind;
		}

		return 'renamed';
	}
}