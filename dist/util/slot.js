export function isSlotBlocked(slot, slots) {
    const requiredIds = new Set(slot.conditions.items.map(condition => condition.id));
    return slots.some(s => requiredIds.has(s.id) && (!s.enabled || !s.equipped));
}
