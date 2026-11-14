export class UIStateView {
    constructor(state) {
        this.state = state;
    }
    /* -------------------------------- Lookup -------------------------------- */
    get lastPanelId() {
        return this.state.lastPanelId;
    }
    get lastTabByPanel() {
        return this.state.lastTabByPanel;
    }
    getLastTab(panelId) {
        return this.state.lastTabByPanel[panelId];
    }
    /* -------------------------------- Mutation -------------------------------- */
    setLastPanel(panelId) {
        this.state.lastPanelId = panelId;
    }
    setLastTab(panelId, tabId) {
        this.state.lastTabByPanel[panelId] = tabId;
    }
    removePanel(panelId) {
        delete this.state.lastTabByPanel[panelId];
        if (this.state.lastPanelId === panelId) {
            this.state.lastPanelId = null;
        }
    }
    clear() {
        this.state.lastPanelId = null;
        this.state.lastTabByPanel = {};
    }
}
