import { OutfitManager } from "../manager/OutfitManager";
import { SlotsRenderer } from "./SlotsRenderer";



export interface OutfitTabsHost {
	public getOutfitManager(): OutfitManager;

	public getSlotsRenderer(): SlotsRenderer;

	public renderContent(): void;

	public sendSystemMessage(message: string): void;

	public exportButtonClickListener(): Promise<void>;
}