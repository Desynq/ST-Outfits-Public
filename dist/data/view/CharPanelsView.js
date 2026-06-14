import { CharPanelGroupsView } from "./CharPanelGroupsView.js";
import { CharPanelSettingsView } from "./PanelViews.js";
export class CharPanelsView {
    constructor(tree) {
        this.tree = tree;
    }
    isPanel(name) {
        return name in this.tree.panels;
    }
    getOrCreate(name) {
        var _a;
        return new CharPanelSettingsView(name, (_a = this.tree.panels)[name] ?? (_a[name] = {
            saveXY: false,
            load_state: 'global'
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
    viewGroups() {
        const getLayoutFromPanel = (name) => {
            const s = this.getOrCreate(name);
            const dXY = s.getXY('desktop');
            const mXY = s.getXY('mobile');
            return {
                desktop: { x: dXY[0], y: dXY[1] },
                mobile: { x: mXY[0], y: mXY[1] }
            };
        };
        return new CharPanelGroupsView(this.tree.groups, (name) => this.isPanel(name), getLayoutFromPanel);
    }
}
