import { toSlot } from "../Constants.js";
import { asBoolean, asObject, asStringRecord, ensureObject, isObject, notObject, resolvePositiveNumber, resolveString, resolveTimestamp } from "../ObjectHelper.js";
import { isRecord } from "../util/narrowing.js";
import { toSlotId } from "../util/normalize/slot.js";
import { normalizeOutfitSnapshots } from "./mappings/OutfitCache.js";
import { ImageBlob, ImageRef, Outfit, OutfitCollection, OutfitImage, OutfitSlot, OutfitTrackerModel, SlotCondition, SlotConditionMap, SlotKind } from "./model/Outfit.js";
import { SlotPreset, SlotPresetV1 } from "./model/SlotPreset.js";


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
		saved_outfits: asObject<Record<string, any>>({}),
		current_outfit: normalizeOutfit,
		hideDisabled: asBoolean(false),
		hideEmpty: asBoolean(false),
		snapshots: asObject<Record<string, any>>({}),
		diffs: asObject<Record<string, any>>({})
	});

	const savedOutfits: Record<string, Outfit> = {};

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
		diffs: raw.diffs
	};
}


function normalizePresetCollection(value: any): OutfitCollection {
	if (value && typeof value === 'object' && !('saved_outfits' in value)) {
		return normalizeOutfitCollection({
			saved_outfits: value,
			current_outfit: {}
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
		([rawId, v]) => {
			const id = toSlotId(rawId);
			return toSlot({
				id,
				kind: inferKindFromId(id),
				value: v
			});
		}
	);

	return { slots };
}

function normalizeKind(kind: unknown): string {
	if (typeof kind !== 'string') return 'Clothing';
	return kind;
}

export function normalizeOutfit(value: unknown): Outfit {
	if (isLegacyOutfit(value)) {
		return normalizeLegacyOutfit(value);
	}

	const raw = ensureObject(value, {
		slots: v => Array.isArray(v) ? v : [],
		values: asStringRecord()
	});

	const slots: OutfitSlot[] = [];
	const seen = new Set<string>();

	for (const slot of raw.slots) {
		if (!slot || typeof slot !== 'object' || typeof slot.id !== 'string') {
			continue;
		}

		const id = toSlotId(slot.id);

		if (!id) {
			continue;
		}

		if (seen.has(id)) continue;
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

		if (seen.has(id)) continue;
		slots.push(toSlot({
			id,
			kind: inferKindFromId(id),
			value: v
		}));
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
): asserts holder is Partial<OutfitTrackerModel> & {
	images: Record<string, ImageBlob>;
} {
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

function isLegacyBlob(v: unknown): v is ImageBlob {
	if (!v || typeof v !== 'object') return false;

	const blob = v as Record<string, unknown>;

	return (
		typeof blob.base64 === 'string' &&
		typeof blob.width === 'number' &&
		typeof blob.height === 'number'
	);
}

function isValidImageRef(v: unknown): v is ImageRef {
	if (!v || typeof v !== 'object') return false;

	const ref = v as Record<string, unknown>;

	return (
		typeof ref.url === 'string' &&
		typeof ref.width === 'number' &&
		typeof ref.height === 'number'
	);
}


export function normalizeSlotPresets(
	holder: {
		slotPresets?: unknown;
		images: Record<string, ImageBlob>;
	}
): void {
	holder.slotPresets = normalizeRecord(
		holder.slotPresets,
		v => normalizeRawSlotPreset(v, holder.images)
	);
}

function normalizeRawSlotPreset(
	value: any,
	images: Record<string, ImageBlob>
): SlotPreset | undefined {
	if (!isRecord(value)) return undefined;

	const presetValue = resolveString(value.value);
	if (!presetValue) return undefined;

	const createdAt = resolveTimestamp(value.createdAt, Date.now());
	const lastUsedAt = resolveTimestamp(value.lastUsedAt, Date.now());

	const preset: SlotPreset = {
		value: presetValue,
		createdAt,
		lastUsedAt
	};

	if (isRecord(value.image)) {
		const key = resolveString(value.image.key);
		if (!key) return undefined;
		if (!images[key]) return undefined;

		const width = resolvePositiveNumber(value.image.width);
		const height = resolvePositiveNumber(value.image.height);
		if (width === undefined || height === undefined) return undefined;

		preset.image = {
			key,
			width,
			height
		};
	}

	return preset;
}


export function normalizeConditionMap(
	slot: unknown
): SlotConditionMap {
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

	const map = rawConditions as Record<string, unknown>;

	const conditions = Array.isArray(map.items)
		? map.items
			.filter((condition): condition is SlotCondition => {
				return !!condition
					&& typeof condition === 'object'
					&& (condition as Record<string, unknown>).type === 'active'
					&& typeof (condition as Record<string, unknown>).id === 'string';
			})
			.map(condition => ({
				type: 'active' as const,
				id: condition.id
			}))
		: [];

	return map.mode === 'and_all'
		? { mode: map.mode, items: conditions }
		: { mode: 'none', items: [] };
}



export function normalizeRecord<T>(
	input: any,
	normalizeValue: (v: any) => T | undefined
): Record<string, T> {
	const out: Record<string, T> = {};
	if (notObject(input)) return out;

	for (const [k, v] of Object.entries(input)) {
		const normalized = normalizeValue(v);
		if (normalized) out[k] = normalized;
	}

	return out;
}