import { PanelGroup, PanelGroupLayout, PanelGroupLayoutTree } from "../model/Panels.js";
import { LayoutMode } from "./PanelViews.js";


export class CharPanelGroupsView {

	public constructor(
		private readonly _groups: PanelGroup[],
		private readonly isPanel: (name: string) => boolean,
		private readonly getLayoutFromPanel: (name: string) => PanelGroupLayoutTree
	) { }

	public getPanelIndex(name: string): number | undefined {
		for (const group of this._groups) {
			const i = group.panels.indexOf(name);
			if (i !== -1) return i;
		}

		return undefined;
	}

	public isGrouped(name: string): boolean {
		return this.findGroupEntry(name) !== undefined;
	}

	public isLeader(name: string): boolean {
		return this.getPanelIndex(name) === 0;
	}

	public isFollower(name: string): boolean {
		const i = this.getPanelIndex(name);
		return i !== undefined && i > 0;
	}

	public getGroup(name: string): string[] | undefined {
		const g = this.findGroupEntry(name)?.group;
		if (!g) return undefined;

		return [...g.panels];
	}

	public group(...names: string[]): boolean {
		if (names.length === 0) return false;

		const seen = new Set<string>();
		for (const name of names) {
			if (!this.isPanel(name)) {
				return false;
			}

			if (this.isGrouped(name)) {
				return false;
			}

			if (seen.has(name)) {
				return false;
			}

			seen.add(name);
		}

		const top = names[0];

		const group: PanelGroup = {
			panels: [...names],
			layout: this.getLayoutFromPanel(top)
		};

		this._groups.push(group);

		return true;
	}

	public append(name: string, to: string): boolean {
		if (name === to) return false;

		if (!this.isPanel(name)) return false;
		if (!this.isPanel(to)) return false;

		// remove first, so appending works as "move-to-end" if already in the group
		this.remove(name);

		const toEntry = this.findGroupEntry(to);
		if (!toEntry) {
			return this.group(to, name);
		}

		toEntry.group.panels.push(name);
		return true;
	}

	public focus(name: string): boolean {
		const entry = this.findGroupEntry(name);
		if (!entry) return false;

		const { group } = entry;

		const i = group.panels.indexOf(name);
		if (i <= 0) return true; // already leader

		group.panels.splice(i, 1);
		group.panels.unshift(name);

		return true;
	}

	public remove(name: string): void {
		const entry = this.findGroupEntry(name);
		if (!entry) return;
		const { group, index: gIndex } = entry;

		const pIndex = group.panels.indexOf(name);
		if (pIndex === -1) return;
		group.panels.splice(pIndex, 1);

		if (group.panels.length === 0) {
			this._groups.splice(gIndex, 1); // gc
		}
	}

	public moveGroup(name: string, mode: LayoutMode, x: number, y: number): boolean {
		const layout = this.findLayout(name, mode);
		if (!layout) return false;

		layout.x = x;
		layout.y = y;

		return true;
	}



	private findGroupEntry(name: string): Readonly<{ group: PanelGroup, index: number; }> | undefined {
		for (let index = 0; index < this._groups.length; index++) {
			const group = this._groups[index];
			if (group.panels.includes(name)) {
				return {
					group,
					index
				};
			}
		}

		return undefined;
	}

	private findLayout(name: string, mode: LayoutMode): PanelGroupLayout | undefined {
		const g = this.findGroupEntry(name)?.group;
		if (!g) return undefined;

		const layout = g.layout[mode];
		return layout;
	}
}