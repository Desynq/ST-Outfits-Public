import { OutfitSlotState } from "../../data/model/OutfitSnapshots.js";

export class DisplaySlot {
	public constructor(
		public readonly displayIndex: number,
		public readonly slotIndex: number,
		public readonly slot: OutfitSlotState
	) { }
}