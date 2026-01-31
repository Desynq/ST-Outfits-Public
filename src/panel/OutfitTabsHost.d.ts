import { PanelSettingsViewMap } from "../data/view/PanelViews";
import { OutfitManager } from "../manager/OutfitManager";
import { PanelType } from "../types/maps";
import { SlotsRenderer } from "./SlotsRenderer";



export interface OutfitTabsHost<T extends PanelType> {
	public getOutfitManager(): OutfitManagerMap[T];

	public getSlotsRenderer(): SlotsRenderer;

	public render(): void;

	public saveAndRenderContent(): void;

	public sendSystemMessage(message: string): void;

	public exportButtonClickListener(): Promise<void>;



	public areDisabledSlotsHidden(): boolean;

	public toggleHideDisabled(): void;


	public areEmptySlotsHidden(): boolean;

	public toggleHideEmpty(): void;


	public getPanelType(): PanelType;

	public getPanelSettings(): PanelSettingsViewMap[T];
}