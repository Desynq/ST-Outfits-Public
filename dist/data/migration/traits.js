import { isRecord } from "../../util/narrowing.js";
/**
 * Migrate global trait identities and every persisted outfit reference together.
 * Run before outfit normalization, and only as part of the relevant version migration.
 */
export function migrateTraitsV2(holder, toDisplayName) {
    const registry = holder.traits;
    if (!isRecord(registry) || !isRecord(registry.definitions))
        return;
    const definitions = {};
    const idMap = new Map();
    for (const [key, value] of Object.entries(registry.definitions)) {
        if (!isRecord(value))
            continue;
        const old = value;
        const oldId = typeof old.id === 'string' && old.id ? old.id : key;
        const legacy = typeof old.name !== 'string';
        const id = legacy ? crypto.randomUUID() : oldId;
        if (legacy) {
            idMap.set(key, id);
            idMap.set(oldId, id);
        }
        definitions[id] = {
            id,
            name: legacy ? toDisplayName(oldId) : old.name,
            description: typeof old.description === 'string' ? old.description : '',
            icon: old.icon ?? null
        };
    }
    // Rewrite references before publishing the re-keyed registry.
    const presets = holder.presets;
    if (isRecord(presets)) {
        migrateCollection(presets.user, idMap);
        if (isRecord(presets.bot)) {
            for (const collection of Object.values(presets.bot)) {
                migrateCollection(collection, idMap);
            }
        }
    }
    holder.traits = { definitions };
}
function migrateCollection(value, idMap) {
    if (!isRecord(value))
        return;
    // The current collection format; tolerate older field names as well.
    migrateOutfit(value.current_outfit ?? value.autoOutfit, idMap);
    const saved = value.saved_outfits ?? value.outfits;
    if (isRecord(saved)) {
        for (const outfit of Object.values(saved))
            migrateOutfit(outfit, idMap);
    }
}
function migrateOutfit(value, idMap) {
    if (!isRecord(value) || !Array.isArray(value.slots))
        return;
    for (const slot of value.slots) {
        if (!isRecord(slot) || slot.type !== 'traits' || !Array.isArray(slot.traits))
            continue;
        for (const assignment of slot.traits) {
            if (!isRecord(assignment) || typeof assignment.traitId !== 'string')
                continue;
            assignment.traitId = idMap.get(assignment.traitId) ?? assignment.traitId;
        }
    }
}
