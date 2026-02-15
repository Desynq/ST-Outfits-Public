import { OutfitTracker } from "../tracker.js";
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
    getKinds() {
        return [...new Set(this.slots.map(s => s.kind))];
    }
    getMutSlotById(id) {
        const i = this.indexById[id];
        return i === undefined ? undefined : this._slots[i];
    }
    getSlotById(id) {
        return this.getMutSlotById(id);
    }
    getSlotAt(index) {
        if (index < 0 || index >= this.slots.length)
            return undefined;
        return this.slots[index];
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
    moveToKind(id, kind) {
        const i = this.indexById[id];
        if (i === undefined)
            return 'slot-not-found';
        const slot = this._slots[i];
        if (slot.kind === kind)
            return 'noop';
        slot.kind = kind;
        const result = this.moveIndex(i, this._slots.length);
        switch (result) {
            case 'moved':
                return 'moved';
            default:
                throw new Error(`Invariant violation: moveIndex failed during moveToKind (result=${result})`);
        }
    }
    setEnabled(id, enabled) {
        const i = this.indexById[id];
        if (i === undefined)
            return false;
        this._slots[i].enabled = enabled;
        return true;
    }
    attachImage(id, tag, blobKey) {
        const i = this.indexById[id];
        if (i === undefined)
            return 'slot-not-found';
        const blob = OutfitTracker.images().getImage(blobKey);
        if (blob === undefined)
            return 'blob-does-not-exist';
        this._slots[i].images[tag] = {
            key: blobKey,
            width: blob.width,
            height: blob.height,
            hidden: false
        };
        return 'attached-image';
    }
    deleteImage(id, tag) {
        const i = this.indexById[id];
        if (i === undefined)
            return {
                status: 'slot-not-found'
            };
        const slot = this._slots[i];
        const image = slot.images[tag];
        if (image === undefined)
            return {
                status: 'image-does-not-exist'
            };
        if (slot.activeImageTag === tag)
            slot.activeImageTag = null;
        const blobKey = image.key;
        delete slot.images[tag];
        return {
            status: 'deleted-image',
            blobKey
        };
    }
    setActiveImage(id, tag) {
        const slot = this.getMutSlotById(id);
        if (!slot)
            return 'slot-not-found';
        if (slot.activeImageTag === tag)
            return 'image-already-active';
        slot.activeImageTag = tag;
        const image = slot.images[tag];
        if (!image)
            return 'image-does-not-exist';
        return 'set-active-image';
    }
    toggleImage(id, tag, hidden) {
        const slot = this.getMutSlotById(id);
        if (!slot)
            return 'slot-not-found';
        const image = slot.images[tag];
        if (!image)
            return 'tag-does-not-exist';
        if (image.hidden === hidden)
            return 'already-set-to-state';
        image.hidden = !hidden;
        return 'toggled';
    }
    resizeImage(id, tag, width, height) {
        const slot = this.getMutSlotById(id);
        if (!slot)
            return 'slot-not-found';
        const image = slot.images[tag];
        if (!image)
            return 'tag-does-not-exist';
        if (image.width === width && image.height === height)
            return 'noop';
        image.width = width;
        image.height = height;
        return 'resized';
    }
    addSlot(id, kind) {
        const i = this.indexById[id];
        if (i !== undefined)
            return 'slot-already-exists';
        this._slots.push({
            id,
            kind,
            value: 'None',
            enabled: true,
            images: {},
            activeImageTag: null
        });
        this.indexById[id] = this._slots.length - 1; // append to index
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
    rename(oldId, newId) {
        const i = this.indexById[oldId];
        if (i === undefined)
            return 'slot-not-found';
        const duplicate = this.indexById[newId];
        if (duplicate !== undefined)
            return 'slot-already-exists';
        this._slots[i].id = newId;
        delete this.indexById[oldId];
        this.indexById[newId] = i;
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
    renameKind(oldKind, newKind) {
        const kinds = this.getKinds();
        let exists = false;
        for (const k of kinds) {
            if (k === newKind)
                return 'new-kind-already-exists';
            if (k === oldKind)
                exists = true;
        }
        if (!exists)
            return 'old-kind-not-found';
        for (const slot of this._slots) {
            if (slot.kind !== oldKind)
                continue;
            slot.kind = newKind;
        }
        return 'renamed';
    }
}
