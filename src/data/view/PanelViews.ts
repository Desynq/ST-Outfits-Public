import { assertNever } from "../../shared.js";
import type { PanelType } from "../../types/maps.js";
import { PanelSettings, XY } from "../model/Outfit.js";

export type LayoutMode = 'desktop' | 'mobile';

export type PanelSettingsViewMap = {
	user: UserPanelSettingsView;
	bot: BotPanelSettingsView;
};

export abstract class PanelSettingsView<T extends PanelType> {
	public constructor(
		protected panelSettings: PanelSettings
	) { }

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

	public getXY(mode: LayoutMode): XY {
		return this.panelSettings[this.accessXY(mode)];
	}

	public setXY(mode: LayoutMode, x: number, y: number): void {
		this.panelSettings[this.accessXY(mode)] = [x, y];
	}

	public isXYSaved(): boolean {
		return this.panelSettings.saveXY;
	}

	public setXYSaving(enabled: boolean): void {
		this.panelSettings.saveXY = enabled;
	}
}

export class UserPanelSettingsView extends PanelSettingsView<'user'> { }

export class BotPanelSettingsView extends PanelSettingsView<'bot'> { }