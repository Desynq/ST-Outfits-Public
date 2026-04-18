import { XY } from "./Outfit.js";



export interface CharPanelsTree {
	panels: Record<string, CharPanelSettings>;
	active: string[];
	groups: PanelGroup[];
}


export interface PanelGroupLayout {
	x: number;
	y: number;
}

export interface PanelGroupLayoutTree {
	desktop: PanelGroupLayout;
	mobile: PanelGroupLayout;
}

export interface PanelGroup {
	panels: string[];
	layout: PanelGroupLayoutTree;
}





export interface PanelSettingsBase {
	saveXY: boolean;
	canLoadFromChat: boolean;

	bgColor1?: string;
	bgColor2?: string;
	borderColor?: string;
}


export interface PanelSettings {
	desktopXY: XY;
	mobileXY: XY;
	saveXY: boolean;
	canLoadFromChat: boolean;
}


export interface FullPanelSettings extends PanelSettingsBase {
	desktopXY: XY;
	mobileXY: XY;
}

export interface PartialPanelSettings extends PanelSettingsBase {
	desktopXY?: XY;
	mobileXY?: XY;
}

export interface FullSummaryTag {
	tag: string;
	attributes: string;
	openingTag: string;
	closingTag: string;
}

export interface CharPanelSettings extends PartialPanelSettings {
	fullSummaryTag?: FullSummaryTag;
}