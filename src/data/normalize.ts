import { asBoolean, asObject, asStringRecord, ensureObject } from "../ObjectHelper.js";
import { normalizeOutfitSnapshots } from "./mappings/OutfitCache.js";
import { ImageBlob, Outfit, OutfitCollection, OutfitImage, OutfitSlot, OutfitTrackerModel, SlotKind } from "./model/Outfit.js";


export function validatePresets(holder: any): void {
	if (!holder || typeof holder !== 'object') return;

	holder.presets ??= {};

	holder.presets.user = normalizePresetCollection(holder.presets.user);

	const botOut: Record<string, OutfitCollection> = {};
	const botRaw = holder.presets.bot;

	if (botRaw && typeof botRaw === 'object') {
		for (const [character, charRaw] of Object.entries(botRaw)) {
			botOut[character] = normalizePresetCollection(charRaw);
		}
	}

	holder.presets.bot = botOut;
}

export function normalizeOutfitCollection(value: any): OutfitCollection {
	const raw = ensureObject<OutfitCollection>(value, {
		outfits: asObject<Record<string, any>>({}),
		autoOutfit: normalizeOutfit,
		hideDisabled: asBoolean(false),
		hideEmpty: asBoolean(false),
		snapshots: asObject<Record<string, any>>({}),
		diffs: asObject<Record<string, any>>({})
	});

	const outfits: Record<string, Outfit> = {};

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
		? 'Accessory'
		: 'Clothing';
}

function normalizeLegacyOutfit(value: any): Outfit {
	const values = asStringRecord()(value);

	const slots: OutfitSlot[] = Object.entries(values).map(
		([id, v]) => ({
			id,
			kind: inferKindFromId(id),
			enabled: true,
			value: v,
			images: {},
			activeImageTag: null
		})
	);

	return { slots };
}

function normalizeKind(kind: unknown): string {
	if (typeof kind !== 'string') return 'Clothing';
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
			value: typeof s.value === 'string' ? s.value : raw.values[s.id] ?? 'None',
			images: normalizeImages(s.images),
			activeImageTag: typeof s.activeImageTag === 'string' ? s.activeImageTag : null
		});
	}

	for (const [id, v] of Object.entries(raw.values)) {
		if (seen.has(id)) continue;

		slots.push({
			id,
			kind: inferKindFromId(id),
			enabled: true,
			value: v,
			images: {},
			activeImageTag: null
		});
	}

	return { slots };
}

function normalizeImages(
	input: unknown
): Record<string, OutfitImage> {
	if (!input || typeof input !== 'object') {
		return {};
	}

	const result: Record<string, OutfitImage> = {};

	for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
		if (!value || typeof value !== 'object') continue;
		const o = value as any;

		if (typeof o.key !== 'string') continue;

		if (typeof o.width !== 'number') continue;

		if (typeof o.height !== 'number') continue;

		if (typeof o.hidden !== 'boolean') o.hidden = false;

		result[key] = {
			key: o.key,
			width: o.width,
			height: o.height,
			hidden: o.hidden
		};
	}

	return result;
}


export function normalizeImageBlobs(
	holder: Partial<OutfitTrackerModel>
): void {
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

function isValidImageBlob(v: unknown): v is ImageBlob {
	if (!v || typeof v !== 'object') return false;

	const blob = v as Record<string, unknown>;

	return (
		typeof blob.base64 === 'string' &&
		typeof blob.width === 'number' &&
		typeof blob.height === 'number'
	);
}