import { PanelSettingsView, PanelSettingsViewMap } from "../data/view/PanelViews";
import { PanelType } from "../types/maps";
import { SlotsRenderer } from "./SlotsRenderer";



export interface OutfitTabsHost<T extends PanelType> {
	getOutfitManager(): OutfitManagerMap[T];

	getSlotsRenderer(): SlotsRenderer;

	renderTabsAndActiveContent(): void;

	saveAndRender(): void;

	sendSystemMessage(message: string): void;

	exportButtonClickListener(): Promise<void>;
	importButtonClickListener(): Promise<void>;



	areDisabledSlotsHidden(): boolean;

	toggleHideDisabled(): void;


	areEmptySlotsHidden(): boolean;

	toggleHideEmpty(): void;

	getPanelSettings(): PanelSettingsViewMap[T];

	applyTheme(): void;
}