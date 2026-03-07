export class CharPanelGroupsView {
    constructor(_groups, isPanel, getLayoutFromPanel) {
        this._groups = _groups;
        this.isPanel = isPanel;
        this.getLayoutFromPanel = getLayoutFromPanel;
    }
    getPanelIndex(name) {
        for (const group of this._groups) {
            const i = group.panels.indexOf(name);
            if (i !== -1)
                return i;
        }
        return undefined;
    }
    isGrouped(name) {
        return this.findGroupEntry(name) !== undefined;
    }
    isLeader(name) {
        return this.getPanelIndex(name) === 0;
    }
    isFollower(name) {
        const i = this.getPanelIndex(name);
        return i !== undefined && i > 0;
    }
    getGroup(name) {
        const g = this.findGroupEntry(name)?.group;
        if (!g)
            return undefined;
        return [...g.panels];
    }
    group(...names) {
        if (names.length === 0)
            return false;
        const seen = new Set();
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
        const group = {
            panels: [...names],
            layout: this.getLayoutFromPanel(top)
        };
        this._groups.push(group);
        return true;
    }
    append(name, to) {
        if (name === to)
            return false;
        if (!this.isPanel(name))
            return false;
        if (!this.isPanel(to))
            return false;
        // remove first, so appending works as "move-to-end" if already in the group
        this.remove(name);
        const toEntry = this.findGroupEntry(to);
        if (!toEntry) {
            return this.group(to, name);
        }
        toEntry.group.panels.push(name);
        return true;
    }
    focus(name) {
        const entry = this.findGroupEntry(name);
        if (!entry)
            return false;
        const { group } = entry;
        const i = group.panels.indexOf(name);
        if (i <= 0)
            return true; // already leader
        group.panels.splice(i, 1);
        group.panels.unshift(name);
        return true;
    }
    remove(name) {
        const entry = this.findGroupEntry(name);
        if (!entry)
            return;
        const { group, index: gIndex } = entry;
        const pIndex = group.panels.indexOf(name);
        if (pIndex === -1)
            return;
        group.panels.splice(pIndex, 1);
        if (group.panels.length === 0) {
            this._groups.splice(gIndex, 1); // gc
        }
    }
    moveGroup(name, mode, x, y) {
        const layout = this.findLayout(name, mode);
        if (!layout)
            return false;
        layout.x = x;
        layout.y = y;
        return true;
    }
    findGroupEntry(name) {
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
    findLayout(name, mode) {
        const g = this.findGroupEntry(name)?.group;
        if (!g)
            return undefined;
        const layout = g.layout[mode];
        return layout;
    }
}
