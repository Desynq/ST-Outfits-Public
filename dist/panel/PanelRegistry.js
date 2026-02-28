import { OutfitTracker } from "../data/tracker.js";
import { CharOutfitPanel } from "./CharOutfitPanel.js";
export class OutfitPanelRegistry {
    constructor(saveSettings, userPanel, botPanel) {
        this.userPanel = userPanel;
        this.botPanel = botPanel;
        this.panels = new Map();
        this.botAutoOpenTimer = null;
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
    }
    getOrCreate(character, saveSettings) {
        if (this.botPanel.character === character) {
            this.botPanel.disable();
        }
        let panel = this.panels.get(character);
        if (panel)
            return { panel, created: false };
        panel = CharOutfitPanel.from(character, saveSettings);
        panel.onHide(() => this.unregister(character));
        this.panels.set(character, panel);
        return { panel, created: true };
    }
    unregister(character) {
        this.panels.delete(character);
        if (this.botPanel.character === character) {
            this.enableBotPanel();
        }
    }
    isReserved(character) {
        return character === 'Unknown' || this.panels.has(character);
    }
    enableBotPanel() {
        if (this.isReserved(this.botPanel.character))
            return;
        this.botPanel.enable();
        if (!OutfitTracker.isAutoOpen().bot) {
            this.cancelBotAutoOpen();
            return;
        }
        this.cancelBotAutoOpen();
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
}
