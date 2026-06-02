export function toSlotId(slotName) {
    return slotName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // drop punctation/symbols
        .replace(/\s+/g, '-') // space → hyphens
        .replace(/-+/g, '-'); // collapse repeat hyphens
}
export function isValidSlotId(id) {
    return id.length > 0 && id === toSlotId(id);
}
