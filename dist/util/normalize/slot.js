/**
 * Drops punctuation/symbols, converts spaces to hyphens, and collapses repeat hyphens
 * @param slotName
 * @returns
 */
export function toSlotId(slotName) {
    return slotName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // drop punctuation/symbols
        .replace(/\s+/g, '-') // space → hyphens
        .replace(/-+/g, '-'); // collapse repeat hyphens
}
export function isValidSlotId(id) {
    return id.length > 0 && id === toSlotId(id);
}
