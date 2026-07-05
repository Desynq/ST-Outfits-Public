import { toSlot } from "../Constants.js";
import { asBoolean, asObject, asStringRecord, ensureObject, notObject, resolvePositiveNumber, resolveString, resolveTimestamp } from "../ObjectHelper.js";
import { isRecord } from "../util/narrowing.js";
import { toSlotId } from "../util/normalize/slot.js";
import { normalizeOutfitSnapshots } from "./mappings/OutfitCache.js";
export function validatePresets(holder) {
    if (!holder || typeof holder !== 'object')
        return;
    holder.presets ??= {};
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
        saved_outfits: asObject({}),
        current_outfit: normalizeOutfit,
        hideDisabled: asBoolean(false),
        hideEmpty: asBoolean(false),
        snapshots: asObject({}),
        diffs: asObject({}),
        character_notes: normalizeCharacterNotes
    });
    const savedOutfits = {};
    for (const [name, v] of Object.entries(raw.saved_outfits)) {
        savedOutfits[name] = isLegacyOutfit(v)
            ? normalizeLegacyOutfit(v)
            : normalizeOutfit(v);
    }
    normalizeOutfitSnapshots(raw.snapshots);
    return {
        saved_outfits: savedOutfits,
        current_outfit: raw.current_outfit,
        hideDisabled: raw.hideDisabled,
        hideEmpty: raw.hideEmpty,
        snapshots: raw.snapshots,
        diffs: raw.diffs,
        character_notes: raw.character_notes
    };
}
function normalizePresetCollection(value) {
    if (value && typeof value === 'object' && !('saved_outfits' in value)) {
        return normalizeOutfitCollection({
            saved_outfits: value,
            current_outfit: {}
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
    const slots = Object.entries(values).map(([rawId, v]) => {
        const id = toSlotId(rawId);
        return toSlot({
            id,
            kind: inferKindFromId(id),
            value: v
        });
    });
    return { slots };
}
function normalizeKind(kind) {
    if (typeof kind !== 'string')
        return 'Clothing';
    return kind;
}
export function normalizeOutfit(value) {
    if (isLegacyOutfit(value)) {
        return normalizeLegacyOutfit(value);
    }
    const raw = ensureObject(value, {
        slots: v => Array.isArray(v) ? v : [],
        values: asStringRecord()
    });
    const slots = [];
    const seen = new Set();
    for (const slot of raw.slots) {
        if (!slot || typeof slot !== 'object' || typeof slot.id !== 'string') {
            continue;
        }
        const id = toSlotId(slot.id);
        if (!id) {
            continue;
        }
        if (seen.has(id))
            continue;
        seen.add(id);
        const activeImageTag = typeof slot.activeImageTag === 'string'
            ? slot.activeImageTag
            : null;
        slots.push({
            id,
            kind: normalizeKind(slot.kind),
            enabled: typeof slot.enabled === 'boolean' ? slot.enabled : true,
            value: typeof slot.value === 'string' ? slot.value : raw.values[id] ?? 'None',
            images: normalizeImages(slot.images),
            activeImageTag: typeof slot.activeImageTag === 'string' ? slot.activeImageTag : null,
            equipped: typeof slot.equipped === 'boolean' ? slot.equipped : true,
            conditions: normalizeConditionMap(slot),
            synced: typeof slot.synced === 'boolean' ? slot.synced : false
        });
    }
    // legacy
    for (const [rawId, v] of Object.entries(raw.values)) {
        const id = toSlotId(rawId);
        if (seen.has(id))
            continue;
        slots.push(toSlot({
            id,
            kind: inferKindFromId(id),
            value: v
        }));
    }
    return { slots };
}
export function normalizeCharacterNotes(value) {
    const raw = asObject({})(value);
    const result = {};
    for (const [characterKey, notesValue] of Object.entries(raw)) {
        const rawNotes = asObject({})(notesValue);
        const notes = {};
        for (const [slotId, noteValue] of Object.entries(rawNotes)) {
            if (typeof noteValue !== 'string')
                continue;
            if (noteValue === '')
                continue;
            notes[slotId] = noteValue;
        }
        if (Object.keys(notes).length > 0) {
            result[characterKey] = notes;
        }
    }
    return result;
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
    for (const [k, v] of Object.entries(holder.images)) {
        if (isLegacyBlob(v)) {
            // keep temporarily; migration will convert
            continue;
        }
        if (!isValidImageRef(holder.images[k])) {
            delete holder.images[k];
        }
    }
}
function isLegacyBlob(v) {
    if (!v || typeof v !== 'object')
        return false;
    const blob = v;
    return (typeof blob.base64 === 'string' &&
        typeof blob.width === 'number' &&
        typeof blob.height === 'number');
}
function isValidImageRef(v) {
    if (!v || typeof v !== 'object')
        return false;
    const ref = v;
    return (typeof ref.url === 'string' &&
        typeof ref.width === 'number' &&
        typeof ref.height === 'number');
}
export function normalizeSlotPresets(holder) {
    holder.slotPresets = normalizeRecord(holder.slotPresets, v => normalizeRawSlotPreset(v, holder.images));
}
function normalizeRawSlotPreset(value, images) {
    if (!isRecord(value))
        return undefined;
    const presetValue = resolveString(value.value);
    if (!presetValue)
        return undefined;
    const createdAt = resolveTimestamp(value.createdAt, Date.now());
    const lastUsedAt = resolveTimestamp(value.lastUsedAt, Date.now());
    const preset = {
        value: presetValue,
        createdAt,
        lastUsedAt
    };
    if (isRecord(value.image)) {
        const key = resolveString(value.image.key);
        if (!key)
            return undefined;
        if (!images[key])
            return undefined;
        const width = resolvePositiveNumber(value.image.width);
        const height = resolvePositiveNumber(value.image.height);
        if (width === undefined || height === undefined)
            return undefined;
        preset.image = {
            key,
            width,
            height
        };
    }
    return preset;
}
export function normalizeConditionMap(slot) {
    if (!isRecord(slot)) {
        return {
            mode: 'none',
            items: []
        };
    }
    const rawConditions = slot.conditions;
    if (!rawConditions || typeof rawConditions !== 'object') {
        return {
            mode: 'none',
            items: []
        };
    }
    const map = rawConditions;
    const conditions = Array.isArray(map.items)
        ? map.items
            .filter((condition) => {
            return !!condition
                && typeof condition === 'object'
                && condition.type === 'active'
                && typeof condition.id === 'string';
        })
            .map(condition => ({
            type: 'active',
            id: condition.id
        }))
        : [];
    return map.mode === 'and_all'
        ? { mode: map.mode, items: conditions }
        : { mode: 'none', items: [] };
}
export function normalizeRecord(input, normalizeValue) {
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
