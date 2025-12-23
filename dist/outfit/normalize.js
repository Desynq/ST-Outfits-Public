import { ensureObject, asObject, asStringRecord } from "../ObjectHelper.js";
export function validatePresets(raw) {
    if (!raw || typeof raw !== 'object')
        return;
    raw.presets ?? (raw.presets = {});
    raw.presets.user = normalizePresetCollection(raw.presets.user);
    const botOut = {};
    const botRaw = raw.presets.bot;
    if (botRaw && typeof botRaw === 'object') {
        for (const [character, charRaw] of Object.entries(botRaw)) {
            botOut[character] = normalizePresetCollection(charRaw);
        }
    }
    raw.presets.bot = botOut;
}
export function normalizeOutfitCollection(value) {
    const raw = ensureObject(value, {
        outfits: asObject({}),
        autoOutfit: normalizeOutfit
    });
    const outfits = {};
    for (const [name, v] of Object.entries(raw.outfits)) {
        outfits[name] = isLegacyOutfit(v)
            ? normalizeLegacyOutfit(v)
            : normalizeOutfit(v);
    }
    return {
        outfits,
        autoOutfit: raw.autoOutfit
    };
}
function normalizePresetCollection(value) {
    if (value && typeof value === 'object' && !('outfits' in value)) {
        return normalizeOutfitCollection({
            outfits: value,
            autoOutfit: {}
        });
    }
    return normalizeOutfitCollection(value);
}
function isLegacyOutfit(value) {
    return (value
        && typeof value === 'object'
        && !Array.isArray(value)
        && !('slots' in value));
}
function inferKindFromId(id) {
    return id.toLowerCase().includes('accessory')
        ? 'Accessory'
        : 'Clothing';
}
function normalizeLegacyOutfit(value) {
    const values = asStringRecord()(value);
    const slots = Object.entries(values).map(([id, v]) => ({
        id,
        kind: inferKindFromId(id),
        enabled: true,
        value: v
    }));
    return { slots };
}
function normalizeKind(kind) {
    if (typeof kind !== 'string')
        return 'Clothing';
    return kind;
}
function normalizeOutfit(value) {
    if (isLegacyOutfit(value)) {
        return normalizeLegacyOutfit(value);
    }
    const raw = ensureObject(value, {
        slots: v => Array.isArray(v) ? v : [],
        values: asStringRecord()
    });
    const slots = [];
    const seen = new Set();
    for (const s of raw.slots) {
        if (!s || typeof s !== 'object' || typeof s.id !== 'string') {
            continue;
        }
        if (seen.has(s.id))
            continue;
        seen.add(s.id);
        slots.push({
            id: s.id,
            kind: normalizeKind(s.kind),
            enabled: typeof s.enabled === 'boolean' ? s.enabled : true,
            value: typeof s.value === 'string' ? s.value : raw.values[s.id] ?? 'None'
        });
    }
    for (const [id, v] of Object.entries(raw.values)) {
        if (seen.has(id))
            continue;
        slots.push({
            id,
            kind: inferKindFromId(id),
            enabled: true,
            value: v
        });
    }
    return { slots };
}
