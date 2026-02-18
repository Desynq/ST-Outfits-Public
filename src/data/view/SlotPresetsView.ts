import { KeyedSlotPreset, SlotPreset } from "../model/SlotPreset.js";



export class SlotPresetRegistry {

	public constructor(
		private _slotPresets: Record<string, SlotPreset>
	) { }

	public has(key: string): boolean {
		return this._slotPresets[key] !== undefined;
	}

	public get(key: string): KeyedSlotPreset | undefined {
		const raw = this._slotPresets[key];
		if (!raw) return undefined;

		return { key, ...raw };
	}

	/**
	 * @returns clone
	 */
	public getAll(): KeyedSlotPreset[] {
		return Object.entries(this._slotPresets)
			.map(([key, preset]) => ({ key, ...preset }));
	}

	/**
	 * @returns clone sorted by last used and then creation date (newest first)
	 */
	public getAllSorted(): KeyedSlotPreset[] {
		return this.getAll().sort((a, b) =>
			(b.lastUsedAt - a.lastUsedAt) ||
			(b.createdAt - a.createdAt)
		);
	}





	public set(preset: KeyedSlotPreset): void {
		const { key, ...raw } = preset;
		this._slotPresets[key] = raw;
	}

	public delete(key: string): void {
		delete this._slotPresets[key];
	}
}