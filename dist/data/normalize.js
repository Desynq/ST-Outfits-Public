import { asBoolean, asObject, resolvePositiveNumber, resolveString, asStringRecord, ensureObject, notObject, resolveTimestamp } from "../ObjectHelper.js";
import { normalizeOutfitSnapshots } from "./mappings/OutfitCache.js";
export function validatePresets(holder) {
    if (!holder || typeof holder !== 'object')
        return;
    holder.presets ?? (holder.presets = {});
    holder.presets.user = normalizePresetCollection(holder.presets.user);
    const botOut = {};
    const botRaw = holder.presets.bot;
    if (botRaw && typeof botRaw === 'object') {
        for (const [character, charRaw] of Object.entries(botRaw)) {
            botOut[character] = normalizePresetCollection(charRaw);
        }
    }
    holder.presets.bot = botOut;
}
export function normalizeOutfitCollection(value) {
    const raw = ensureObject(value, {
        outfits: asObject({}),
        autoOutfit: normalizeOutfit,
        hideDisabled: asBoolean(false),
        hideEmpty: asBoolean(false),
        snapshots: asObject({}),
        diffs: asObject({})
    });
    const outfits = {};
    for (const [name, v] of Object.entries(raw.outfits)) {
        outfits[name] = isLegacyOutfit(v)
            ? normalizeLegacyOutfit(v)
            : normalizeOutfit(v);
    }
    normalizeOutfitSnapshots(raw.snapshots);
    return {
        outfits,
        autoOutfit: raw.autoOutfit,
        hideDisabled: raw.hideDisabled,
        hideEmpty: raw.hideEmpty,
        snapshots: raw.snapshots,
        diffs: raw.diffs
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
        value: v,
        images: {},
        activeImageTag: null,
        equipped: true
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
            value: typeof s.value === 'string' ? s.value : raw.values[s.id] ?? 'None',
            images: normalizeImages(s.images),
            activeImageTag: typeof s.activeImageTag === 'string' ? s.activeImageTag : null,
            equipped: typeof s.equipped === 'boolean' ? s.equipped : true
        });
    }
    for (const [id, v] of Object.entries(raw.values)) {
        if (seen.has(id))
            continue;
        slots.push({
            id,
            kind: inferKindFromId(id),
            enabled: true,
            value: v,
            images: {},
            activeImageTag: null,
            equipped: true
        });
    }
    return { slots };
}
function normalizeImages(input) {
    if (!input || typeof input !== 'object') {
        return {};
    }
    const result = {};
    for (const [key, value] of Object.entries(input)) {
        if (!value || typeof value !== 'object')
            continue;
        const o = value;
        if (typeof o.key !== 'string')
            continue;
        if (typeof o.width !== 'number')
            continue;
        if (typeof o.height !== 'number')
            continue;
        if (typeof o.hidden !== 'boolean')
            o.hidden = false;
        result[key] = {
            key: o.key,
            width: o.width,
            height: o.height,
            hidden: o.hidden
        };
    }
    return result;
}
export function normalizeImageBlobs(holder) {
    if (!holder.images || typeof holder.images !== 'object') {
        holder.images = {};
        return;
    }
    for (const k of Object.keys(holder.images)) {
        if (!isValidImageBlob(holder.images[k])) {
            delete holder.images[k];
        }
    }
}
function isValidImageBlob(v) {
    if (!v || typeof v !== 'object')
        return false;
    const blob = v;
    return (typeof blob.base64 === 'string' &&
        typeof blob.width === 'number' &&
        typeof blob.height === 'number');
}
export function normalizeSlotPresets(holder) {
    holder.slotPresets = normalizeRecord(holder.slotPresets, v => normalizeRawSlotPreset(v, holder.images));
}
function normalizeRawSlotPreset(value, images) {
    if (notObject(value))
        return undefined;
    const presetValue = resolveString(value.value);
    const imageKey = resolveString(value.imageKey);
    if (!presetValue || !imageKey)
        return undefined;
    if (!images[imageKey])
        return undefined;
    const imageWidth = resolvePositiveNumber(value.imageWidth);
    const imageHeight = resolvePositiveNumber(value.imageHeight);
    if (imageWidth === undefined || imageHeight === undefined)
        return undefined;
    const createdAt = resolveTimestamp(value.timestamp, Date.now());
    const lastUsedAt = resolveTimestamp(value.timestamp, Date.now());
    return {
        value: presetValue,
        imageKey,
        imageWidth,
        imageHeight,
        createdAt,
        lastUsedAt
    };
}
function normalizeRecord(input, normalizeValue) {
    const out = {};
    if (notObject(input))
        return out;
    for (const [k, v] of Object.entries(input)) {
        const normalized = normalizeValue(v);
        if (normalized)
            out[k] = normalized;
    }
    return out;
}
