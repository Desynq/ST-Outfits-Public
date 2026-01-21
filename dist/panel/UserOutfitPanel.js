import { OutfitPanel } from './OutfitPanel.js';
import { OutfitTracker } from '../outfit/tracker.js';
import { queryOrThrow } from '../util/ElementHelper.js';
export class UserOutfitPanel extends OutfitPanel {
    constructor(outfitManager) {
        super(outfitManager);
        this.isVisible = false;
        this.minimized = false;
        this.domElement = null;
    }
    initializePanel() {
        if (this.domElement)
            return;
        const panel = document.createElement('div');
        panel.id = 'user-outfit-panel';
        panel.className = 'outfit-panel';
        /*html*/
        panel.innerHTML = `
            <div class="outfit-header">
                <h3>${this.getHeaderTitle()}</h3>
            </div>
            <div class="outfit-tabs"></div>
            <div class="outfit-content" id="user-outfit-tab-content"></div>
        `;
        document.body.appendChild(panel);
        this.domElement = panel;
        this.makePanelDraggable();
        this.makeHeaderMinimizable();
        const outfitHeaderDiv = queryOrThrow(this.domElement, HTMLDivElement, '.outfit-header');
        const outfitActionsDiv = this.createOutfitActions();
        outfitHeaderDiv.appendChild(outfitActionsDiv);
    }
    async exportButtonClickListener() {
        const presetName = prompt('Name this export:');
        if (!presetName)
            return;
        const characterName = prompt('Export for which character?\nAdd "_user" to the end to export to a persona.\n');
        let message;
        const trimmedPreset = presetName.trim();
        if (characterName && characterName.trim() !== '') {
            const trimmedCharacter = characterName.trim();
            message = await this.outfitManager.exportPreset(trimmedPreset, trimmedCharacter);
        }
        else {
            message = 'You must supply a character name!';
        }
        if (message && OutfitTracker.areSystemMessagesEnabled()) {
            this.sendSystemMessage(message);
        }
        this.saveAndRenderContent();
    }
    getHeaderTitle() {
        return 'Your Outfit';
    }
}
