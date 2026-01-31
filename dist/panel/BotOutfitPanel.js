import { OutfitTracker } from '../data/tracker.js';
import { queryOrThrow } from '../util/ElementHelper.js';
import { OutfitPanel } from './OutfitPanel.js';
export class BotOutfitPanel extends OutfitPanel {
    constructor(outfitManager) {
        super(outfitManager);
        this.isVisible = false;
        this.minimized = false;
        this.panelEl = null;
    }
    initializePanel() {
        if (this.panelEl)
            return false;
        const panel = document.createElement('div');
        panel.id = 'bot-outfit-panel';
        panel.className = 'outfit-panel';
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
        this.makePanelDraggable();
        this.makeHeaderMinimizable();
        const outfitHeaderDiv = queryOrThrow(this.panelEl, HTMLDivElement, '.outfit-header');
        const outfitActionsDiv = this.createOutfitActions();
        outfitHeaderDiv.appendChild(outfitActionsDiv);
        return true;
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
    updateCharacter(name) {
        this.outfitManager.setCharacter(name);
        if (this.panelEl && !this.minimized) {
            const header = this.panelEl.querySelector('.outfit-header h3');
            if (header)
                header.textContent = `${name}'s Outfit`;
        }
        this.render();
    }
    getPanelType() {
        return 'bot';
    }
}
