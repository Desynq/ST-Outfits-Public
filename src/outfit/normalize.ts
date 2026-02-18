import { ensureObject, asObject, asStringRecord } from "../ObjectHelper.js";
import { OutfitCollection, Outfit, OutfitSlot, SlotKind } from "./model/Outfit.js";


export function validatePresets(raw: any): void {
	if (!raw || typeof raw !== 'object') return;

	raw.presets ??= {};

	raw.presets.user = normalizePresetCollection(raw.presets.user);

	const botOut: Record<string, OutfitCollection> = {};
	const botRaw = raw.presets.bot;

	if (botRaw && typeof botRaw === 'object') {
		for (const [character, charRaw] of Object.entries(botRaw)) {
			botOut[character] = normalizePresetCollection(charRaw);
		}
	}

	raw.presets.bot = botOut;
}

export function normalizeOutfitCollection(value: any): OutfitCollection {
	const raw = ensureObject<OutfitCollection>(value, {
		outfits: asObject<Record<string, any>>({}),
		autoOutfit: normalizeOutfit
	});

	const outfits: Record<string, Outfit> = {};

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


function normalizePresetCollection(value: any): OutfitCollection {
	if (value && typeof value === 'object' && !('outfits' in value)) {
		return normalizeOutfitCollection({
			outfits: value,
			autoOutfit: {}
		});
	}

	return normalizeOutfitCollection(value);
}


function isLegacyOutfit(value: any): value is Record<string, string> {
	return (
		value
		&& typeof value === 'object'
		&& !Array.isArray(value)
		&& !('slots' in value)
	);
}

function inferKindFromId(id: string): SlotKind {
	return id.toLowerCase().includes('accessory')
		? 'accessory'
		: 'clothing';
}

function normalizeLegacyOutfit(value: any): Outfit {
	const values = asStringRecord()(value);

	const slots: OutfitSlot[] = Object.entries(values).map(
		([id, v]) => ({
			id,
			kind: inferKindFromId(id),
			enabled: true,
			value: v
		})
	);

	return { slots };
}

function normalizeKind(kind: unknown): string {
	if (typeof kind !== 'string') return 'clothing';
	if (kind === 'outfits') return 'clothing';
	return kind;
}

function normalizeOutfit(value: any): Outfit {
	if (isLegacyOutfit(value)) {
		return normalizeLegacyOutfit(value);
	}

	const raw = ensureObject(value, {
		slots: v => Array.isArray(v) ? v : [],
		values: asStringRecord()
	});

	const slots: OutfitSlot[] = [];
	const seen = new Set<string>();

	for (const s of raw.slots) {
		if (!s || typeof s !== 'object' || typeof s.id !== 'string') {
			continue;
		}

		if (seen.has(s.id)) continue;
		seen.add(s.id);

		slots.push({
			id: s.id,
			kind: normalizeKind(s.kind),
			enabled: typeof s.enabled === 'boolean' ? s.enabled : true,
			value: typeof s.value === 'string' ? s.value : raw.values[s.id] ?? 'None'
		});
	}

	for (const [id, v] of Object.entries(raw.values)) {
		if (seen.has(id)) continue;

		slots.push({
			id,
			kind: inferKindFromId(id),
			enabled: true,
			value: v
		});
	}

	return { slots };
}
