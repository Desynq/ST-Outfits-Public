import { assertRecord, ensureRecordProperty, isRecord } from "../../util/narrowing.js";
import { OutfitTrackerModel, PanelSettings, XY } from "../model/Outfit.js";

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