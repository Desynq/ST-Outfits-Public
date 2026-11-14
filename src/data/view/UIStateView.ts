import type { UIStateModel } from "../model/ui-state.js";



export class UIStateView {

	public constructor(
		private readonly state: UIStateModel
	) { }

	/* -------------------------------- Lookup -------------------------------- */

	public get lastPanelId(): string | null {
		return this.state.lastPanelId;
	}

	public get lastTabByPanel(): Readonly<Record<string, string>> {
		return this.state.lastTabByPanel;
	}

	public getLastTab(panelId: string): string | undefined {
		return this.state.lastTabByPanel[panelId];
	}

	/* -------------------------------- Mutation -------------------------------- */

	public setLastPanel(panelId: string | null): void {
		this.state.lastPanelId = panelId;
	}

	public setLastTab(panelId: string, tabId: string): void {
		this.state.lastTabByPanel[panelId] = tabId;
	}

	public removePanel(panelId: string): void {
		delete this.state.lastTabByPanel[panelId];

		if (this.state.lastPanelId === panelId) {
			this.state.lastPanelId = null;
		}
	}

	public clear(): void {
		this.state.lastPanelId = null;
		this.state.lastTabByPanel = {};
	}
}
