import { OutfitManager } from "../manager/OutfitManager";

export interface OutfitSlotsHost {
	public isMinimized(): boolean;

	public areDisabledSlotsHidden(): boolean;

	public areEmptySlotsHidden(): boolean;

	public getOutfitManager(): OutfitManager;

	public renderTabsAndActiveContent(): void;

	public saveAndRender(): void;

	public sendSystemMessage(message: string): void;
}