import { CharPanelSettingsView } from "./PanelViews.js";
export class CharPanelsView {
    constructor(tree) {
        this.tree = tree;
    }
    getOrCreate(name) {
        var _a;
        return new CharPanelSettingsView(name, (_a = this.tree.panels)[name] ?? (_a[name] = {
            saveXY: false
        }));
    }
    isActive(name) {
        return this.tree.active.includes(name);
    }
    setActive(name) {
        if (this.isActive(name))
            return false;
        this.tree.active.push(name);
        return true;
    }
    removeActive(name) {
        if (!this.isActive(name))
            return false;
        this.tree.active = this.tree.active.filter(s => s !== name);
        return true;
    }
    getActives() {
        return this.tree.active;
    }
}
