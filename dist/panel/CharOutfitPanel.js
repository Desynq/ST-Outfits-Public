import { OutfitTracker } from "../data/tracker.js";
import { CharOutfitManager } from "../manager/CharOutfitManager.js";
import { el } from "../util/ElementHelper.js";
import { EventBus } from "../util/EventBus.js";
import { fromKebabCase } from "../util/StringHelper.js";
import { OutfitPanel } from "./OutfitPanel.js";
export class CharOutfitPanel extends OutfitPanel {
    constructor(outfitManager, grouper, getCurrentCharacterKey) {
        super(outfitManager);
        this.getCurrentCharacterKey = getCurrentCharacterKey;
        this.destroyBus = new EventBus();
        this.setGrouper(grouper);
    }
    static from({ characterKey, saveSettings, grouper, displayName = characterKey, getCurrentCharacterKey }) {
        const manager = new CharOutfitManager(saveSettings, characterKey, displayName);
        const panel = new CharOutfitPanel(manager, grouper, getCurrentCharacterKey);
        manager.setFullSummaryTagResolver(() => panel.getPanelSettings().getFullSummaryTag());
        return panel;
    }
    onDestroy(listener) {
        this.destroyBus.add(listener);
        return this;
    }
    get characterKey() {
        return this.outfitManager.characterKey;
    }
    get displayName() {
        return this.outfitManager.displayName;
    }
    get panelsView() {
        return OutfitTracker.viewCharPanels();
    }
    initializePanel() {
        if (this.panelEl)
            return false;
        const outfitHeader = el('div', {
            className: 'outfit-header',
            children: [
                el('h3', {
                    text: this.getHeaderTitle()
                })
            ]
        });
        const outfitTabs = el('div', {
            className: 'outfit-tabs'
        });
        const outfitContent = el('div', {
            className: 'outfit-content'
        });
        const panel = el('div', {
            className: 'outfit-panel char-outfit-panel',
            children: [
                outfitHeader,
                outfitTabs,
                outfitContent
            ]
        });
        document.body.append(panel);
        this.panelEl = panel;
        // this.makePanelDraggable();
        this.bindMinimizeEvents();
        const outfitActions = this.createOutfitActions();
        outfitHeader.append(outfitActions);
        return true;
    }
    getPanelSettings() {
        return this.panelsView.getOrCreate(this.characterKey);
    }
    async exportButtonClickListener() {
        const presetName = prompt('Name this export:');
        if (!presetName)
            return;
        const characterName = prompt('Export for which character?\nAdd "_user" to the end to export to a persona.\n' +
            '(Leave blank to export as a global user preset)');
        let message;
        const trimmedPreset = presetName.trim();
        if (!characterName) {
            message = 'Cancelled.';
        }
        else if (characterName.trim() !== '') {
            const trimmedCharacter = characterName.trim();
            message = await this.outfitManager.exportPreset(trimmedPreset, trimmedCharacter);
        }
        else {
            message = await this.outfitManager.exportPresetToUser(trimmedPreset);
        }
        if (message && OutfitTracker.areSystemMessagesEnabled()) {
            this.sendSystemMessage(message);
        }
        this.saveAndRender();
    }
    getHeaderTitle() {
        const tag = this.getPanelSettings().getFullSummaryTag()?.tag;
        if (tag === undefined) {
            return `${this.characterKey}'s Outfit`;
        }
        if (this.characterKey.toLowerCase().endsWith(tag)) {
            return `${this.characterKey}`;
        }
        return `${this.characterKey}'s ${fromKebabCase(tag)}`;
    }
    getPanelType() {
        return 'char';
    }
    show(options = {}) {
        if (!super.show(options))
            return false;
        this.panelsView.setActive(this.characterKey);
        this.outfitManager.saveSettings();
        return true;
    }
    close({ destroy = true } = {}) {
        super.close();
        if (destroy)
            this.destroy();
    }
    destroy() {
        this.panelEl?.remove();
        this.panelEl = null;
        this.disposer.dispose();
        this.outfitManager.clearSummaries();
        this.panelsView.removeActive(this.characterKey);
        this.outfitManager.saveSettings();
        this.destroyBus.emit();
    }
    /**
     * Saves to chat only if this panel is in chat-enabled mode.
     * @returns `false` if chat persistence is disabled.
     */
    saveToChat() {
        if (!this.getPanelSettings().canLoadFromChat())
            return false;
        OutfitTracker.characterOutfits(this.characterKey).saveCurrentOutfitToChat();
        return true;
    }
    loadFromChat() {
        if (!this.getPanelSettings().canLoadFromChat())
            return false;
        this.outfitManager.getOutfitCollection().loadCurrentOutfitFromChat();
        this.renderTabsAndActiveContent();
        return true;
    }
    saveToCharacter() {
        if (this.getPanelSettings().getLoadState() !== 'character')
            return false;
        const ck = this.getCurrentCharacterKey();
        if (ck === null)
            return false;
        const name = `@character:${ck}`;
        this.outfitManager.saveOutfitAs(name);
        return true;
    }
    loadFromCharacter() {
        if (this.getPanelSettings().getLoadState() !== 'character')
            return false;
        const ck = this.getCurrentCharacterKey();
        if (ck === null)
            return false;
        const name = `@character:${ck}`;
        const result = this.outfitManager.loadSavedOutfit(name);
        if (result === 'not-found') {
            this.outfitManager.getOutfitCollection().clearCurrentOutfit();
        }
        this.renderTabsAndActiveContent();
        return true;
    }
}
