import { isRecord } from "../../util/narrowing.js";
import type { TraitDefinition, TraitDefinitionV1 } from "../model/Outfit.js";
import type { SettingsModel } from "../model/settings.js";

type LegacyDefinition = TraitDefinition | TraitDefinitionV1;

/**
 * Migrate global trait identities and every persisted outfit reference together.
 * Run before outfit normalization, and only as part of the relevant version migration.
 */
export function migrateTraitsV2(
	holder: Partial<SettingsModel>,
	toDisplayName: (id: string) => string
): void {
	const registry = holder.traits;
	if (!isRecord(registry) || !isRecord(registry.definitions)) return;

	const definitions: Record<string, TraitDefinition> = {};
	const idMap = new Map<string, string>();

	for (const [key, value] of Object.entries(registry.definitions)) {
		if (!isRecord(value)) continue;

		const old = value as unknown as LegacyDefinition;
		const oldId = typeof old.id === 'string' && old.id ? old.id : key;
		const legacy = typeof (old as TraitDefinition).name !== 'string';
		const id = legacy ? crypto.randomUUID() : oldId;

		if (legacy) {
			idMap.set(key, id);
			idMap.set(oldId, id);
		}

		definitions[id] = {
			id,
			name: legacy
				? toDisplayName(oldId)
				: (old as TraitDefinition).name,
			group: typeof value.group === 'string'
				? value.group.trim()
				: '',
			description: typeof old.description === 'string'
				? old.description
				: '',
			contextInline: value.contextInline === true,
			icon: old.icon ?? null // TODO: icon normalization
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

function migrateCollection(value: unknown, idMap: ReadonlyMap<string, string>): void {
	if (!isRecord(value)) return;

	// The current collection format; tolerate older field names as well.
	migrateOutfit(value.current_outfit ?? value.autoOutfit, idMap);
	const saved = value.saved_outfits ?? value.outfits;
	if (isRecord(saved)) {
		for (const outfit of Object.values(saved)) migrateOutfit(outfit, idMap);
	}
}

function migrateOutfit(value: unknown, idMap: ReadonlyMap<string, string>): void {
	if (!isRecord(value) || !Array.isArray(value.slots)) return;

	for (const slot of value.slots) {
		if (!isRecord(slot) || slot.type !== 'traits' || !Array.isArray(slot.traits)) continue;
		for (const assignment of slot.traits) {
			if (!isRecord(assignment) || typeof assignment.traitId !== 'string') continue;
			assignment.traitId = idMap.get(assignment.traitId) ?? assignment.traitId;
		}
	}
}