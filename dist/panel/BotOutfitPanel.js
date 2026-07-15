import { OutfitTracker } from '../data/tracker.js';
import { queryOrThrow } from '../util/ElementHelper.js';
import { EventBus } from '../util/EventBus.js';
import { OutfitPanel } from './OutfitPanel.js';
export class BotOutfitPanel extends OutfitPanel {
    constructor(outfitManager) {
        super(outfitManager);
        this.updateCharBus = new EventBus();
    }
    get character() {
        return this.outfitManager.character;
    }
    initializePanel() {
        if (this.panelEl)
            return false;
        const panel = document.createElement('div');
        panel.className = 'outfit-panel bot-outfit-panel';
        /*html*/
        panel.innerHTML = `
			<div class="outfit-header">
				<h3>${this.getHeaderTitle()}</h3>
			</div>
			<div class="outfit-tabs"></div>
			<div class="outfit-content" id="bot-outfit-tab-content"></div>
		`;
        document.body.appendChild(panel);
        this.panelEl = panel;
        // this.makePanelDraggable();
        this.bindMinimizeEvents();
        const outfitHeaderDiv = queryOrThrow(this.panelEl, HTMLDivElement, '.outfit-header');
        const outfitActionsDiv = this.createOutfitActions();
        outfitHeaderDiv.appendChild(outfitActionsDiv);
        return true;
    }
    getPanelSettings() {
        return OutfitTracker.botPanel();
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
        return `${this.outfitManager.character}'s Outfit`;
    }
    updateCharacter(name, domOnly = false) {
        if (!domOnly) {
            this.outfitManager.setCharacter(name);
        }
        if (this.panelEl && !this.minimized) {
            const header = this.panelEl.querySelector('.outfit-header h3');
            if (header)
                header.textContent = `${name}'s Outfit`;
        }
        this.renderTabsAndActiveContent();
        this.updateCharBus.emit();
    }
    getPanelType() {
        return 'bot';
    }
    onUpdateCharacter(listener) {
        this.updateCharBus.add(listener);
    }
    saveToChat() {
        if (!this.getPanelSettings().canLoadFromChat())
            return false;
        OutfitTracker.characterOutfits(this.character).saveCurrentOutfitToChat();
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
        const name = `@character:${this.character}`;
        this.outfitManager.saveOutfitAs(name);
    }
}
