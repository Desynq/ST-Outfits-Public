import { isObject, notObject } from "../../ObjectHelper.js";
import { UIStateModel } from "../model/ui-state.js";



export function normalizeUIState(holder: unknown): void {
	if (!isObject(holder)) {
		return;
	}

	const obj: Record<string, unknown> = isObject(holder.uiState)
		? holder.uiState
		: {};

	const lastTabByPanel: Record<string, string> = {};

	if (isObject(obj.lastTabByPanel)) {
		for (const [panelId, tabId] of Object.entries(obj.lastTabByPanel)) {
			if (typeof tabId === 'string') {
				lastTabByPanel[panelId] = tabId;
			}
		}
	}

	obj.lastPanelId = typeof obj.lastPanelId === 'string'
		? obj.lastPanelId
		: null;

	obj.lastTabByPanel = lastTabByPanel;
	holder.uiState = obj;
}