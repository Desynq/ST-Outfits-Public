import { OutfitManager } from "../manager/OutfitManager";
import { SlotsRenderer } from "./SlotsRenderer";



export interface OutfitTabsHost {
	public getOutfitManager(): OutfitManager;

	public getSlotsRenderer(): SlotsRenderer;

	public renderContent(): void;

	public saveAndRenderContent(): void;

	public sendSystemMessage(message: string): void;

	public exportButtonClickListener(): Promise<void>;



	public areDisabledSlotsHidden(): boolean;

	public toggleHideDisabled(): void;


	public areEmptySlotsHidden(): boolean;

	public toggleHideEmpty(): void;
}