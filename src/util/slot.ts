import { OutfitSlot } from "../data/model/Outfit.js";


export function isSlotBlocked(slot: Readonly<OutfitSlot>, slots: readonly Readonly<OutfitSlot>[]): boolean {
	const requiredIds = new Set(
		slot.conditions.items.map(condition => condition.id)
	);

	return slots.some(s =>
		requiredIds.has(s.id) && (!s.enabled || !s.equipped)
	);
}