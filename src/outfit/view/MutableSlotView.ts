import { Outfit, OutfitSlot, SlotKind } from "../model/Outfit";


export type MoveSlotResult =
	| 'slot-not-found'
	| 'index-out-of-bounds'
	| 'noop'
	| 'moved';

export type RenameResult =
	| 'slot-not-found'
	| 'slot-already-exists'
	| 'renamed';

export type AddSlotResult =
	| 'invalid-slot-kind'
	| 'slot-already-exists'
	| 'added';

export class MutableSlotView {

	private readonly _slots: OutfitSlot[];
	private indexById!: Record<string, number | undefined>;

	public constructor(slots: OutfitSlot[]) {
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

	public get slots(): readonly Readonly<OutfitSlot>[] {
		return this._slots;
	}

	public getSlotById(id: string): Readonly<OutfitSlot> | undefined {
		const i = this.indexById[id];
		return i === undefined ? undefined : this._slots[i];
	}

	public getSlotAt(index: number): Readonly<OutfitSlot> | undefined {
		if (index < 0 || index >= this._slots.length) return undefined;

		return this._slots[index];
	}

	public getIndex(id: string): number | undefined {
		return this.indexById[id];
	}

	/* -------------------------------- Mutation -------------------------------- */

	public setValue(id: string, value: string): boolean {
		const i = this.indexById[id];
		if (i === undefined) return false;

		this._slots[i].value = value;
		return true;
	}

	/**
	 * Undecided on whether the user should be allowed to change a slot's kind directly.
	 *
	 * The current UI groups slots by kind and orders them by index within each group.
	 * Changing a slot's kind implicitly changes its ordering context.
	 *
	 * Allowing this mutation directly would require the user to also choose
	 * the target position in the new group to preserve UX predictability.
	 *
	 * For now, the user must delete the slot from one category and re-add it to the other.
	 * @deprecated
	 */
	private setKind(id: string, kind: SlotKind): boolean {
		const i = this.indexById[id];
		if (i === undefined) return false;

		this._slots[i].kind = kind;
		return true;
	}

	public setEnabled(id: string, enabled: boolean): boolean {
		const i = this.indexById[id];
		if (i === undefined) return false;

		this._slots[i].enabled = enabled;
		return true;
	}

	private isValidSlotKind(kind: string): boolean {
		return /^[a-z](?:[a-z]|_(?=[a-z])|-(?=[a-z]))*$/.test(kind) && kind !== 'outfits';
	}

	public addSlot(id: string, kind: SlotKind): AddSlotResult {
		if (!this.isValidSlotKind(kind)) return 'invalid-slot-kind';

		const i = this.indexById[id];
		if (i !== undefined) return 'slot-already-exists';

		this._slots.push({
			id,
			kind,
			value: 'None',
			enabled: true
		});
		this.rebuildIndex();
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

	public rename(id: string, newId: string): RenameResult {
		const i = this.indexById[id];
		if (i === undefined) return 'slot-not-found';

		const duplicate = this.indexById[newId];
		if (duplicate !== undefined) return 'slot-already-exists';

		this._slots[i].id = newId;
		this.rebuildIndex();
		return 'renamed';
	}
}