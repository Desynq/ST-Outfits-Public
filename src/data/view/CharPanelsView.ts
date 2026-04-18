import { CharPanelSettings, CharPanelsTree, PanelGroup, PanelGroupLayout, PanelGroupLayoutTree } from "../model/Panels.js";
import { OutfitTracker } from "../tracker.js";
import { CharPanelGroupsView } from "./CharPanelGroupsView.js";
import { CharPanelSettingsView, LayoutMode } from "./PanelViews.js";





export class CharPanelsView {

	public constructor(
		private readonly tree: CharPanelsTree
	) { }

	public isPanel(name: string): boolean {
		return name in this.tree.panels;
	}

	public getOrCreate(name: string): CharPanelSettingsView {
		return new CharPanelSettingsView(name, this.tree.panels[name] ??= {
			saveXY: false,
			canLoadFromChat: true
		});
	}

	public isActive(name: string): boolean {
		return this.tree.active.includes(name);
	}

	public setActive(name: string): boolean {
		if (this.isActive(name)) return false;

		this.tree.active.push(name);

		return true;
	}

	public removeActive(name: string): boolean {
		if (!this.isActive(name)) return false;

		this.tree.active = this.tree.active.filter(s => s !== name);

		return true;
	}

	public getActives(): readonly string[] {
		return this.tree.active;
	}

	public viewGroups(): CharPanelGroupsView {
		const getLayoutFromPanel = (name: string): PanelGroupLayoutTree => {
			const s = this.getOrCreate(name);
			const dXY = s.getXY('desktop');
			const mXY = s.getXY('mobile');
			return {
				desktop: { x: dXY[0], y: dXY[1] },
				mobile: { x: mXY[0], y: mXY[1] }
			};
		};

		return new CharPanelGroupsView(
			this.tree.groups,
			(name: string) => this.isPanel(name),
			getLayoutFromPanel
		);
	}
}