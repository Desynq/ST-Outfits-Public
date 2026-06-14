import { OutfitTracker } from "../data/tracker.js";
import { MappedEventBus } from "../util/EventBus.js";
import { CharOutfitPanel } from "./CharOutfitPanel.js";
export class OutfitPanelRegistry {
    constructor(saveSettings, userPanel, botPanel, getCurrentCharacterKey) {
        this.saveSettings = saveSettings;
        this.userPanel = userPanel;
        this.botPanel = botPanel;
        this.getCurrentCharacterKey = getCurrentCharacterKey;
        this.panels = new Set();
        this.charPanels = new Map();
        this.groupAppendBus = new MappedEventBus();
        this.groupRemoveBus = new MappedEventBus();
        this.groupFocusBus = new MappedEventBus();
        this.botAutoOpenTimer = null;
        this.panels
            .add(userPanel)
            .add(botPanel);
        this.openActiveCharPanels();
        botPanel.onUpdateCharacter(() => {
            if (this.isReserved(this.botPanel.character)) {
                this.botPanel.disable();
                return;
            }
            this.enableBotPanel();
        });
        if (OutfitTracker.isAutoOpen().user) {
            userPanel.autoOpen();
        }
        for (const panel of this.panels) {
            panel.onExpand(() => this.handlePanelExpanded(panel));
            panel.onFocus(() => {
                for (const p of this.panels) {
                    if (p === panel)
                        continue;
                    p.setFront(false);
                }
                panel.setFront(true);
            });
        }
        // this.resolveOverlaps();
    }
    onGroupAppend(name, listener) {
        this.groupAppendBus.set(name, listener);
    }
    onGroupRemove(name, listener) {
        this.groupRemoveBus.set(name, listener);
    }
    onGroupFocus(name, listener) {
        this.groupFocusBus.set(name, listener);
    }
    viewGroups() {
        return OutfitTracker.viewCharPanels().viewGroups();
    }
    openActiveCharPanels() {
        const groups = this.viewGroups();
        for (const name of OutfitTracker.viewCharPanels().getActives()) {
            const { panel } = this.getOrCreate(name);
            if (groups.isFollower(name)) {
                panel.hide();
            }
            else {
                panel.autoOpen();
            }
        }
    }
    handlePanelExpanded(panel) {
        for (const other of this.panels) {
            if (other === panel)
                continue;
            if (other.isMinimized())
                continue;
            other.setMinimize(true);
        }
    }
    getCharPanels() {
        return Array.from(this.charPanels.values());
    }
    getOrCreate(character) {
        if (this.botPanel.character === character) {
            this.botPanel.disable();
        }
        let panel = this.charPanels.get(character);
        if (panel) {
            return { panel, created: false };
        }
        panel = CharOutfitPanel.from({
            characterKey: character,
            saveSettings: this.saveSettings,
            grouper: this,
            getCurrentCharacterKey: this.getCurrentCharacterKey
        });
        // char panels can be created mid-chat
        if (panel.getPanelSettings().canLoadFromChat()) {
            panel.outfitManager.getOutfitCollection().loadCurrentOutfitFromChat();
        }
        panel.onDestroy(() => this.unregister(character));
        panel.onDrop((packet) => this.handleCharPanelDrop(panel, packet));
        this.panels.add(panel);
        this.charPanels.set(character, panel);
        return { panel, created: true };
    }
    handleCharPanelDrop(panel, packet) {
        const { mode, cursor } = packet;
        const name = panel.characterKey;
        const groups = this.viewGroups();
        groups.moveGroup(name, mode, cursor.x, cursor.y);
        let droppedOn = null;
        for (const [n, p] of this.charPanels) {
            if (n === name)
                continue;
            if (!p.isVisible())
                continue;
            const rect = p.getBoundingClientRect();
            const inside = cursor.x >= rect.left &&
                cursor.x <= rect.right &&
                cursor.y >= rect.top &&
                cursor.y <= rect.bottom;
            if (inside) {
                droppedOn = p;
                break;
            }
        }
        if (droppedOn) {
            this.append(droppedOn, panel);
        }
    }
    unregister(character) {
        const panel = this.charPanels.get(character);
        if (!panel) {
            return;
        }
        this.groupAppendBus.remove(character);
        this.groupRemoveBus.remove(character);
        this.panels.delete(panel);
        this.charPanels.delete(character);
        this.viewGroups().remove(character);
        if (this.botPanel.character === character) {
            this.enableBotPanel();
        }
        this.saveSettings();
    }
    isReserved(character) {
        return character === 'Unknown' || this.charPanels.has(character);
    }
    append(parent, child) {
        const groups = this.viewGroups();
        groups.append(child.characterKey, parent.characterKey);
        child.close({ destroy: false });
        const parentMode = parent.getLayoutMode();
        const parentXY = parent.getPanelSettings().getXY(parentMode);
        child.getPanelSettings().setXY(parentMode, ...parentXY);
        this.saveSettings();
        this.groupAppendBus.emit(parent, child);
    }
    ungroup(panel) {
        const name = panel.characterKey;
        const groups = this.viewGroups();
        const group = groups.getGroup(name);
        if (!group)
            return;
        const leader = this.getOrCreate(group[0]).panel;
        groups.remove(panel.characterKey);
        const mode = leader.getLayoutMode();
        const [x, y] = this.computeUngroupPosition(panel, leader, group, mode);
        panel.getPanelSettings().setXY(mode, x, y);
        panel.show({
            forcePos: true
        });
        panel.setMinimize(false);
        this.saveSettings();
        this.groupRemoveBus.emit(panel);
    }
    computeUngroupPosition(panel, leader, group, mode) {
        const [leaderX, leaderY] = leader.getSavedXY(mode);
        if (panel === leader) {
            return [leaderX, leaderY];
        }
        leader.setMinimize(true);
        const rect = leader.getBoundingClientRect();
        const viewportMid = window.innerHeight / 2;
        const offset = rect.height + 8;
        const index = group.indexOf(panel.characterKey);
        const direction = rect.top < viewportMid ? 1 : -1;
        return [leaderX, leaderY + offset * index * direction];
    }
    focus(panel) {
        if (!panel.canShow())
            return false;
        const groups = this.viewGroups();
        const group = groups.getGroup(panel.characterKey);
        if (!group)
            return false;
        const prevLeader = this.getOrCreate(group[0]).panel;
        const mode = prevLeader.getLayoutMode();
        const prevXY = prevLeader.getPanelSettings().getXY(mode);
        panel.getPanelSettings().setXY(mode, ...prevXY);
        prevLeader.close({ destroy: false });
        groups.focus(panel.characterKey);
        panel.show({
            forcePos: true
        });
        panel.setMinimize(false);
        this.saveSettings();
        this.groupFocusBus.emit(panel);
        return true;
    }
    getGroup(panel) {
        const groups = this.viewGroups();
        const group = groups.getGroup(panel.characterKey);
        if (!group) {
            return [];
        }
        return group.map(name => this.getOrCreate(name).panel);
    }
    enableBotPanel() {
        if (this.isReserved(this.botPanel.character)) {
            return;
        }
        this.botPanel.enable();
        if (!OutfitTracker.isAutoOpen().bot) {
            return;
        }
        this.cancelBotAutoOpen(); // debounce
        this.botAutoOpenTimer = setTimeout(() => {
            this.botAutoOpenTimer = null;
            if (!OutfitTracker.isAutoOpen().bot)
                return;
            if (this.isReserved(this.botPanel.character))
                return;
            this.botPanel.autoOpen();
        }, 100);
    }
    cancelBotAutoOpen() {
        if (this.botAutoOpenTimer === null)
            return;
        clearTimeout(this.botAutoOpenTimer);
        this.botAutoOpenTimer = null;
    }
    resolveOverlaps() {
        const Y_OFFSET = 48;
        let prev = null;
        for (const panel of this.panels) {
            if (prev) {
                const mode = panel.getLayoutMode();
                const settings = panel.getPanelSettings();
                const [x, y] = settings.getXY(mode);
                const [ox, oy] = prev.getPanelSettings().getXY(mode); // mode is global
                if (x === ox && y === oy) {
                    prev.hide();
                }
            }
            prev = panel;
        }
    }
}
