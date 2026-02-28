import { OutfitTracker } from "../data/tracker.js";
import { CharOutfitManager } from "../manager/CharOutfitManager.js";
import { el } from "../util/ElementHelper.js";
import { fromKebabCase } from "../util/StringHelper.js";
import { OutfitPanel } from "./OutfitPanel.js";
export class CharOutfitPanel extends OutfitPanel {
    constructor(outfitManager) {
        super(outfitManager);
    }
    static from(character, saveSettings) {
        const manager = new CharOutfitManager(saveSettings, character);
        const panel = new CharOutfitPanel(manager);
        manager.setFullSummaryTagResolver(() => panel.getPanelSettings().getFullSummaryTag());
        return panel;
    }
    get character() {
        return this.outfitManager.character;
    }
    get panelsView() {
        return OutfitTracker.charPanels();
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
        this.makePanelDraggable();
        this.makeHeaderMinimizable();
        const outfitActions = this.createOutfitActions();
        outfitHeader.append(outfitActions);
        return true;
    }
    getPanelSettings() {
        return this.panelsView.getOrCreate(this.character);
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
            return `${this.character}'s Outfit`;
        }
        if (this.character.toLowerCase().endsWith(tag)) {
            return `${this.character}`;
        }
        return `${this.character}'s ${fromKebabCase(tag)}`;
    }
    getPanelType() {
        return 'char';
    }
    show(setDefaultX, setDefaultY) {
        if (!super.show(setDefaultX, setDefaultY))
            return false;
        this.panelsView.setActive(this.character);
        this.outfitManager.saveSettings();
        return true;
    }
    hide() {
        super.hide();
        this.panelEl?.remove();
        this.panelEl = null;
        this.panelsView.removeActive(this.character);
        this.outfitManager.saveSettings();
    }
}
