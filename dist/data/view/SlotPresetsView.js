export class SlotPresetRegistry {
    constructor(_slotPresets) {
        this._slotPresets = _slotPresets;
    }
    has(key) {
        return this._slotPresets[key] !== undefined;
    }
    get(key) {
        const raw = this._slotPresets[key];
        if (!raw)
            return undefined;
        return { key, ...raw };
    }
    /**
     * @returns clone
     */
    getAll() {
        return Object.entries(this._slotPresets)
            .map(([key, preset]) => ({ key, ...preset }));
    }
    /**
     * @returns clone sorted by last used and then creation date (newest first)
     */
    getAllSorted() {
        return this.getAll().sort((a, b) => (b.lastUsedAt - a.lastUsedAt) ||
            (b.createdAt - a.createdAt));
    }
    set(preset) {
        const { key, ...raw } = preset;
        this._slotPresets[key] = raw;
    }
    delete(key) {
        delete this._slotPresets[key];
    }
}
