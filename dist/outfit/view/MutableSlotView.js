export class MutableSlotView {
    constructor(slots) {
        this._slots = slots;
        this.rebuildIndex();
    }
    rebuildIndex() {
        this.indexById = {};
        for (let i = 0; i < this._slots.length; i++) {
            const id = this._slots[i].id;
            if (id in this.indexById) {
                throw new Error(`Duplicate slot id: ${id}`);
            }
            this.indexById[id] = i;
        }
    }
    get slots() {
        return this._slots;
    }
    getSlotById(id) {
        const i = this.indexById[id];
        return i === undefined ? undefined : this._slots[i];
    }
    getSlotAt(index) {
        if (index < 0 || index >= this._slots.length)
            return undefined;
        return this._slots[index];
    }
    getIndex(id) {
        return this.indexById[id];
    }
    /* -------------------------------- Mutation -------------------------------- */
    setValue(id, value) {
        const i = this.indexById[id];
        if (i === undefined)
            return false;
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
    setKind(id, kind) {
        const i = this.indexById[id];
        if (i === undefined)
            return false;
        this._slots[i].kind = kind;
        return true;
    }
    setEnabled(id, enabled) {
        const i = this.indexById[id];
        if (i === undefined)
            return false;
        this._slots[i].enabled = enabled;
        return true;
    }
    isValidSlotKind(kind) {
        return /^[a-z](?:[a-z]|_(?=[a-z])|-(?=[a-z]))*$/.test(kind) && kind !== 'outfits';
    }
    addSlot(id, kind) {
        if (!this.isValidSlotKind(kind))
            return 'invalid-slot-kind';
        const i = this.indexById[id];
        if (i !== undefined)
            return 'slot-already-exists';
        this._slots.push({
            id,
            kind,
            value: 'None',
            enabled: true
        });
        this.rebuildIndex();
        return 'added';
    }
    deleteSlot(id) {
        const i = this.indexById[id];
        if (i === undefined)
            return false;
        this._slots.splice(i, 1);
        this.rebuildIndex();
        return true;
    }
    moveIndex(sourceIndex, targetIndex, reIndex = true) {
        const slots = this._slots;
        if (sourceIndex < 0 || sourceIndex >= slots.length) {
            return 'slot-not-found';
        }
        if (targetIndex < 0 || targetIndex > slots.length) {
            return 'index-out-of-bounds';
        }
        if (sourceIndex === targetIndex)
            return 'noop';
        const [slot] = slots.splice(sourceIndex, 1);
        slots.splice(targetIndex, 0, slot);
        if (reIndex)
            this.rebuildIndex();
        return 'moved';
    }
    move(id, targetIndex) {
        const i = this.indexById[id];
        if (i === undefined)
            return 'slot-not-found';
        return this.moveIndex(i, targetIndex);
    }
    rename(id, newId) {
        const i = this.indexById[id];
        if (i === undefined)
            return 'slot-not-found';
        const duplicate = this.indexById[newId];
        if (duplicate !== undefined)
            return 'slot-already-exists';
        this._slots[i].id = newId;
        this.rebuildIndex();
        return 'renamed';
    }
    sortByKind(kindOrder) {
        const buckets = new Map();
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
                if (!bucket)
                    continue;
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
}
