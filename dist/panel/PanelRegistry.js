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
        this.panelOrder = [];
        this.charPanels = new Map();
        this.activePanel = null;
        this.groupFocusBus = new MappedEventBus();
        this.botAutoOpenTimer = null;
        this.initialPanelId = OutfitTracker.viewUIState().lastPanelId;
        this.initializationDeadline = Date.now() + 2000;
        this.initialPanelOpened = false;
        this.lastCharacter = null;
        const globalPanels = [userPanel, botPanel];
        for (const panel of globalPanels) {
            panel.setGrouper(this);
            this.registerPanel(panel);
        }
        this.openActiveCharPanels();
        this.sortInitialOrder();
        this.initialPanelOpened = this.restoreLastPanel();
        if (!this.initialPanelOpened && OutfitTracker.isAutoOpen().user) {
            this.initialPanelOpened = this.focus(userPanel);
            if (this.initialPanelOpened) {
                userPanel.setMinimize(true);
            }
        }
        botPanel.onUpdateCharacter(() => {
            this.handleCharacterUpdate();
        });
    }
    refreshActivePanel() {
        this.activePanel?.renderTabsAndActiveContent();
    }
    recontextualize({ allPanels = false, filter }) {
        if (allPanels) {
            for (const panel of this.panels) {
                panel.outfitManager.recontextualize(filter);
            }
        }
        else {
            this.activePanel?.outfitManager.recontextualize(filter);
        }
    }
    registerPanel(panel) {
        if (this.panels.has(panel)) {
            return;
        }
        this.panels.add(panel);
        this.panelOrder.push(panel);
        panel.onFocus(() => {
            this.promotePanel(panel);
            for (const other of this.panels) {
                if (other === panel) {
                    continue;
                }
                other.setFront(false);
            }
            panel.setFront(true);
        });
        panel.clickedClose.add(() => {
            this.autoFocus();
        });
    }
    restoreLastPanel() {
        if (!this.initialPanelId) {
            return false;
        }
        if (this.initialPanelId === this.botPanel.outfitManager.getName()) {
            return true;
        }
        const panel = this.getGroup().find(panel => panel.outfitManager.getName() === this.initialPanelId);
        if (!panel || !this.focus(panel)) {
            return false;
        }
        panel.setMinimize(true);
        return true;
    }
    promotePanel(panel) {
        const index = this.panelOrder.indexOf(panel);
        if (index <= 0) {
            return;
        }
        this.panelOrder.splice(index, 1);
        this.panelOrder.unshift(panel);
    }
    sortInitialOrder() {
        this.panelOrder.sort((a, b) => a.getHeaderTitle().localeCompare(b.getHeaderTitle(), undefined, {
            numeric: true,
            sensitivity: 'base'
        }));
    }
    onGroupFocus(name, listener) {
        this.groupFocusBus.set(name, listener);
    }
    openActiveCharPanels() {
        const actives = OutfitTracker.viewCharPanels().getActives();
        for (const name of actives) {
            const { panel } = this.getOrCreate(name);
            panel.hide();
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
        panel.onDestroy(() => this.unregisterCustomPanel(character));
        this.registerPanel(panel);
        this.charPanels.set(character, panel);
        return { panel, created: true };
    }
    unregisterCustomPanel(character) {
        const panel = this.charPanels.get(character);
        if (!panel) {
            return;
        }
        this.panels.delete(panel);
        this.charPanels.delete(character);
        this.groupFocusBus.remove(character);
        const orderIndex = this.panelOrder.indexOf(panel);
        if (orderIndex !== -1) {
            this.panelOrder.splice(orderIndex, 1);
        }
        if (this.activePanel === panel) {
            this.activePanel = null;
        }
        if (this.botPanel.character === character) {
            const replaced = this.openBotPanel();
            if (!replaced) {
                this.autoFocus();
            }
        }
        else {
            this.autoFocus();
        }
        this.saveSettings();
    }
    isReserved(character) {
        return character === 'Unknown' || this.charPanels.has(character);
    }
    /**
     * Focuses the given panel.
     *
     * Calling this with the already focused panel has no effect
     */
    focus(panel) {
        if (!panel.canShow()) {
            return false;
        }
        if (!this.panels.has(panel)) {
            return false;
        }
        if (this.activePanel === panel) {
            return true;
        }
        this.promotePanel(panel);
        if (this.activePanel) {
            this.activePanel.hide();
            this.activePanel.setFront(false);
        }
        this.activePanel = panel;
        const panelId = panel.outfitManager.getName();
        const uiState = OutfitTracker.viewUIState();
        uiState.setLastPanel(panelId);
        this.saveSettings();
        const lastTabId = uiState.getLastTab(panelId);
        if (lastTabId !== undefined) {
            panel.restoreTab(lastTabId);
        }
        panel.show();
        panel.setFront(true);
        this.groupFocusBus.emit(panel);
        return true;
    }
    autoFocus() {
        const panel = this.getGroup()[0];
        if (!panel) {
            this.activePanel = null;
            return false;
        }
        return this.focus(panel);
    }
    getGroup() {
        return [...this.panelOrder].filter(panel => panel.canShow());
    }
    openBotPanel() {
        if (this.isReserved(this.botPanel.character)) {
            return false;
        }
        this.botPanel.enable();
        if (!OutfitTracker.isAutoOpen().bot) {
            return false;
        }
        this.focus(this.botPanel);
        this.botPanel.setMinimize(true);
        return true;
    }
    handleCharacterUpdate() {
        const character = this.botPanel.character;
        const reserved = this.charPanels.has(character);
        const characterChanged = character !== this.lastCharacter;
        this.lastCharacter = character;
        // Keep the bot panel available for Unknown.
        if (reserved) {
            this.botPanel.disable();
        }
        else {
            this.botPanel.enable();
        }
        // Unknown should update the panel without automatically focusing it.
        if (character === 'Unknown') {
            return;
        }
        if (character !== 'Unknown'
            && !reserved
            && this.initialPanelId === this.botPanel.outfitManager.getName()
            && this.activePanel === null) {
            if (this.focus(this.botPanel)) {
                this.botPanel.setMinimize(true);
            }
            return;
        }
        // Preserve the initially restored panel during startup.
        if (this.initialPanelOpened
            && Date.now() < this.initializationDeadline) {
            return;
        }
        this.focus(this.botPanel);
        this.botPanel.setMinimize(true);
    }
}
