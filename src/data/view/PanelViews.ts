import { assertNever } from "../../shared.js";
import type { PanelType } from "../../types/maps.js";
import { PanelSettings, XY } from "../model/Outfit.js";

export type LayoutMode = 'desktop' | 'mobile';

export type PanelSettingsViewMap = {
	user: UserPanelSettingsView;
	bot: BotPanelSettingsView;
};

export const defaultUserPanelSettings: PanelSettings = {
	desktopXY: [20, 50],
	mobileXY: [20, 50],
	saveXY: false
};

export const defaultBotPanelSettings: PanelSettings = {
	...defaultUserPanelSettings,
	desktopXY: [20, 110],
	mobileXY: [20, 110]
};

export type PanelSettingsMap = {
	userPanel: PanelSettings;
	botPanel: PanelSettings;
};

export abstract class PanelSettingsView<T extends PanelType> {
	public constructor(
		protected panelSettings: PanelSettings
	) { }

	protected abstract getDefaultSettings(): PanelSettings;

	protected accessXY(mode: LayoutMode): 'desktopXY' | 'mobileXY' {
		switch (mode) {
			case 'desktop':
				return 'desktopXY';
			case 'mobile':
				return 'mobileXY';
			default:
				assertNever(mode);
		}
	}

	public getDefaultXY(mode: LayoutMode): XY {
		return this.getDefaultSettings()[this.accessXY(mode)];
	}

	public getXY(mode: LayoutMode): XY {
		return this.panelSettings[this.accessXY(mode)];
	}

	public setXY(mode: LayoutMode, x: number, y: number): void {
		this.panelSettings[this.accessXY(mode)] = [x, y];
	}

	public resetXY(mode: LayoutMode): void {
		this.setXY(mode, ...this.getDefaultXY(mode));
	}

	public isXYSaved(): boolean {
		return this.panelSettings.saveXY;
	}

	public setXYSaving(enabled: boolean): void {
		this.panelSettings.saveXY = enabled;
	}
}

export class UserPanelSettingsView extends PanelSettingsView<'user'> {
	protected override getDefaultSettings(): PanelSettings {
		return defaultUserPanelSettings;
	}
}

export class BotPanelSettingsView extends PanelSettingsView<'bot'> {
	protected override getDefaultSettings(): PanelSettings {
		return defaultBotPanelSettings;
	}
}