export class OutfitPanelContext {
    constructor(panel) {
        this.panel = panel;
    }
    get outfitManager() {
        return this.panel.getOutfitManager();
    }
    get outfitView() {
        return this.outfitManager.getOutfitView();
    }
}
