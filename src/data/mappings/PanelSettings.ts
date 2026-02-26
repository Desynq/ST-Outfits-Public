import { asObject, asStringArray, ensureObject } from "../../ObjectHelper.js";
import { ensureRecordProperty } from "../../util/narrowing.js";
import { CharPanelsTree, OutfitTrackerModel, PanelSettings, XY } from "../model/Outfit.js";
import { PartialPanelSettings } from "../view/PanelViews.js";

export function normalizeXY(value: unknown, fallback: XY): XY {
	if (
		Array.isArray(value) &&
		value.length === 2 &&
		typeof value[0] === 'number' &&
		typeof value[1] === 'number'
	) {
		return [value[0], value[1]] as const;
	}

	return fallback;
}

function isXY(value: unknown): value is XY {
	return Array.isArray(value) &&
		value.length === 2 &&
		typeof value[0] === 'number' &&
		typeof value[1] === 'number';
}

export function normalizePanelSettings(
	holder: Partial<OutfitTrackerModel>,
	key: 'userPanel' | 'botPanel',
	fallback: PanelSettings
): void {
	const target = ensureRecordProperty(holder, key);

	target.desktopXY = normalizeXY(target.desktopXY, fallback.desktopXY);
	target.mobileXY = normalizeXY(target.mobileXY, fallback.mobileXY);
	target.saveXY = typeof target.saveXY === 'boolean'
		? target.saveXY
		: fallback.saveXY;
}



export function normalizeCharPanels(obj: unknown): CharPanelsTree {
	const raw = ensureObject(obj, {
		active: asStringArray(),
		panels: asObject({} as Record<string, any>)
	});

	const panels: Record<string, PartialPanelSettings> = {};
	for (const [k, v] of Object.entries(raw.panels)) {
		if (!v || typeof v !== 'object') continue;

		const panel: PartialPanelSettings = {
			saveXY: typeof v.saveXY === 'boolean' ? v.saveXY : false
		};

		if (isXY(v.desktopXY)) panel.desktopXY = v.desktopXY;
		if (isXY(v.mobileXY)) panel.mobileXY = v.mobileXY;

		const bg1 = normalizeHexColor(v.bgColor1);
		const bg2 = normalizeHexColor(v.bgColor2);
		const border = normalizeHexColor(v.borderColor);

		if (bg1) panel.bgColor1 = bg1;
		if (bg2) panel.bgColor2 = bg2;
		if (border) panel.borderColor = border;

		panels[k] = panel;
	}

	const active: string[] = [];
	for (const name of raw.active) {
		if (name in panels) active.push(name);
	}

	return {
		active,
		panels
	};
}

function normalizeHexColor(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;

	let v = value.trim();

	// Allow missing #
	if (!v.startsWith('#')) {
		v = `#${v}`;
	}

	// 3 or 6 hex digits only
	const shortHex = /^#([0-9a-fA-F]{3})$/;
	const longHex = /^#([0-9a-fA-F]{6})$/;

	if (shortHex.test(v)) {
		// Expand #abc -> #aabbcc
		const [, h] = v.match(shortHex)!;
		return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`.toLowerCase();
	}

	if (longHex.test(v)) {
		return v.toLowerCase();
	}

	return undefined;
}