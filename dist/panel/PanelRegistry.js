import { OutfitTracker } from "../data/tracker.js";
import { CharOutfitPanel } from "./CharOutfitPanel.js";
export class OutfitPanelRegistry {
    constructor(saveSettings, userPanel, botPanel) {
        this.userPanel = userPanel;
        this.botPanel = botPanel;
        this.panels = new Set();
        this.charPanels = new Map();
        this.botAutoOpenTimer = null;
        this.panels
            .add(userPanel)
            .add(botPanel);
        for (const active of OutfitTracker.charPanels().getActives()) {
            const { panel } = this.getOrCreate(active, saveSettings);
            panel.autoOpen();
        }
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
        }
        this.resolveOverlaps();
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
    getOrCreate(character, saveSettings) {
        if (this.botPanel.character === character) {
            this.botPanel.disable();
        }
        let panel = this.charPanels.get(character);
        if (panel)
            return { panel, created: false };
        panel = CharOutfitPanel.from(character, saveSettings, this);
        panel.onDestroy(() => this.unregister(character));
        this.panels.add(panel);
        this.charPanels.set(character, panel);
        return { panel, created: true };
    }
    unregister(character) {
        const panel = this.charPanels.get(character);
        if (!panel) {
            return;
        }
        this.panels.delete(panel);
        this.charPanels.delete(character);
        if (this.botPanel.character === character) {
            this.enableBotPanel();
        }
    }
    isReserved(character) {
        return character === 'Unknown' || this.charPanels.has(character);
    }
    switchPanel(from, to) {
        if (from === to)
            return false;
        if (!to.canShow())
            return false;
        from.close({ destroy: false });
        const mode = from.getLayoutMode();
        const fromXY = from.getPanelSettings().getXY(mode);
        // set x, y so other shows in place of this when restoring from saved x, y
        to.getPanelSettings().setXY(mode, ...fromXY);
        to.outfitManager.saveSettings();
        to.show({
            forceSizeAndPos: true
        });
        to.setMinimize(false);
        return true;
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
