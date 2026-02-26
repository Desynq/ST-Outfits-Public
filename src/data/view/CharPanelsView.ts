import { CharPanelsTree } from "../model/Outfit.js";
import { CharPanelSettingsView } from "./PanelViews.js";





export class CharPanelsView {

	public constructor(
		private readonly tree: CharPanelsTree
	) { }

	public getOrCreate(name: string): CharPanelSettingsView {
		return new CharPanelSettingsView(name, this.tree.panels[name] ??= {
			saveXY: false
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
}