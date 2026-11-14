import { isObject } from "../../ObjectHelper.js";
export function normalizeUIState(holder) {
    if (!isObject(holder)) {
        return;
    }
    const obj = isObject(holder.uiState)
        ? holder.uiState
        : {};
    const lastTabByPanel = {};
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
