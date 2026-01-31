import { PanelSettings, XY } from "../model/Outfit";

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
	holder: any,
	key: 'userPanel' | 'botPanel',
	fallback: PanelSettings
): void {
	if (!holder || typeof holder !== 'object') return;

	holder[key] ??= {};
	const panel = holder[key];

	if (!panel || typeof panel !== 'object') {
		holder[key] = {};
	}

	const target = holder[key];
	target.desktopXY = normalizeXY(target.desktopXY, fallback.desktopXY);
	target.mobileXY = normalizeXY(target.mobileXY, fallback.mobileXY);
	target.saveXY = typeof target.saveXY === 'boolean' ? target.saveXY : fallback.saveXY;
}


