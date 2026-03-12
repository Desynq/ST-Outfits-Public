import { OutfitManager } from "../manager/OutfitManager";

export interface OutfitSlotsHost {
	isMinimized(): boolean;

	areDisabledSlotsHidden(): boolean;

	areEmptySlotsHidden(): boolean;

	getOutfitManager(): OutfitManager;

	renderTabsAndActiveContent(): void;

	saveAndRender(): void;

	sendSystemMessage(message: string): void;
}