import { MutableOutfitView } from "../../data/view/MutableOutfitView";
import { OutfitManager } from "../../manager/OutfitManager";
import { PanelType } from "../../types/maps";
import { OutfitPanel } from "../OutfitPanel";


export abstract class OutfitPanelContext {

	public constructor(
		protected readonly panel: OutfitPanel<PanelType>
	) { }

	protected get outfitManager(): OutfitManager {
		return this.panel.getOutfitManager();
	}

	protected get outfitView(): MutableOutfitView {
		return this.outfitManager.getOutfitView();
	}
}