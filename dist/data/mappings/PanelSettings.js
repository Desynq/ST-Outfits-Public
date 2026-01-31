export function normalizeXY(value, fallback) {
    if (Array.isArray(value) &&
        value.length === 2 &&
        typeof value[0] === 'number' &&
        typeof value[1] === 'number') {
        return [value[0], value[1]];
    }
    return fallback;
}
export function normalizePanelSettings(holder, key, fallback) {
    if (!holder || typeof holder !== 'object')
        return;
    holder[key] ?? (holder[key] = {});
    const panel = holder[key];
    if (!panel || typeof panel !== 'object') {
        holder[key] = {};
    }
    const target = holder[key];
    target.desktopXY = normalizeXY(target.desktopXY, fallback.desktopXY);
    target.mobileXY = normalizeXY(target.mobileXY, fallback.mobileXY);
    target.saveXY = typeof target.saveXY === 'boolean' ? target.saveXY : fallback.saveXY;
}
