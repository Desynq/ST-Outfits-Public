import { assertNever } from "../../shared.js";
import { PanelSettings, XY } from "../model/Outfit.js";

export type LayoutMode = 'desktop' | 'mobile';

export type PanelSettingsViewMap = {
	user: UserPanelSettingsView;
	bot: BotPanelSettingsView;
	char: CharPanelSettingsView;
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

export const defaultCharPanelSettings: PanelSettings = {
	...defaultBotPanelSettings,
	desktopXY: [20, 170],
	mobileXY: [20, 170]
};

interface PanelSettingsBase {
	saveXY: boolean;

	bgColor1?: string;
	bgColor2?: string;
	borderColor?: string;
}

export type PanelColorKey = keyof Pick<PanelSettingsBase, 'bgColor1' | 'bgColor2' | 'borderColor'>;

export interface FullPanelSettings extends PanelSettingsBase {
	desktopXY: XY;
	mobileXY: XY;
}

export interface PartialPanelSettings extends PanelSettingsBase {
	desktopXY?: XY;
	mobileXY?: XY;
}


export abstract class PanelSettingsView<TSettings extends PartialPanelSettings> {
	public constructor(
		protected settings: TSettings
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

	protected abstract getDefaultTheme(): {
		bgColor1: string;
		bgColor2: string;
		borderColor: string;
	};

	public get bgColor1(): string {
		return this.settings.bgColor1 ?? this.getDefaultTheme().bgColor1;
	}
	public get bgColor2(): string {
		return this.settings.bgColor2 ?? this.getDefaultTheme().bgColor2;
	}
	public get borderColor(): string {
		return this.settings.borderColor ?? this.getDefaultTheme().borderColor;
	}

	public setColor(key: PanelColorKey, color: string | null): void {
		if (color === null) {
			delete this.settings[key];
			return;
		}

		this.settings[key] = color;
	}




	public getDefaultXY(mode: LayoutMode): XY {
		return this.getDefaultSettings()[this.accessXY(mode)];
	}

	public getXY(mode: LayoutMode): XY {
		const key = this.accessXY(mode);

		return (
			this.settings[key] ??
			(this.settings[key] = this.getDefaultSettings()[key])
		);
	}

	public setXY(mode: LayoutMode, x: number, y: number): void {
		this.settings[this.accessXY(mode)] = [x, y];
	}

	public resetXY(mode: LayoutMode): void {
		this.setXY(mode, ...this.getDefaultXY(mode));
	}

	public isXYSaved(): boolean {
		return this.settings.saveXY;
	}

	public setXYSaving(enabled: boolean): void {
		this.settings.saveXY = enabled;
	}
}



export class UserPanelSettingsView extends PanelSettingsView<FullPanelSettings> {
	protected override getDefaultSettings(): FullPanelSettings {
		return defaultUserPanelSettings;
	}

	protected override getDefaultTheme() {
		return {
			bgColor1: '#1e88e5',
			bgColor2: '#3d5afe',
			borderColor: '#64b5f6'
		};
	}
}


export class BotPanelSettingsView extends PanelSettingsView<FullPanelSettings> {
	protected override getDefaultSettings(): FullPanelSettings {
		return defaultBotPanelSettings;
	}

	protected override getDefaultTheme() {
		return {
			bgColor1: '#7a57d1',
			bgColor2: '#6559e0',
			borderColor: '#8783e1'
		};
	}
}


export class CharPanelSettingsView extends PanelSettingsView<PartialPanelSettings> {
	public constructor(
		protected readonly name: string,
		panelSettings: PartialPanelSettings
	) {
		super(panelSettings);
	}

	protected override getDefaultSettings(): PanelSettings {
		return {
			saveXY: false,
			desktopXY: [20, 170],
			mobileXY: [20, 170]
		};
	}

	protected override getDefaultTheme() {
		return {
			bgColor1: '#2a1f26',
			bgColor2: '#33242d',
			borderColor: '#4a3540'
		};
	}
}
