import { OutfitManager } from "../../manager/OutfitManager.js";
import { PanelType } from "../../types/maps.js";
import { OutfitTabsHost } from "../OutfitTabsHost.js";


export abstract class PanelTab {

	protected readonly outfitManager: OutfitManager;

	public constructor(
		protected readonly panel: OutfitTabsHost<PanelType>
	) {
		this.outfitManager = this.panel.getOutfitManager();
	}

	public abstract render(contentArea: HTMLDivElement): void;
}