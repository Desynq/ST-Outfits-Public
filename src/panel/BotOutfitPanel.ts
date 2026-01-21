import { OutfitPanel } from './OutfitPanel.js';
import { mouseDragElement } from '../shared.js';
import { BotOutfitManager } from '../manager/BotOutfitManager.js';
import { OutfitTracker } from '../outfit/tracker.js';
import { queryOrThrow } from '../util/ElementHelper.js';

export class BotOutfitPanel extends OutfitPanel<BotOutfitManager> {
    public constructor(
        outfitManager: BotOutfitManager
    ) {
        super(outfitManager);
        this.isVisible = false;
        this.minimized = false;
        this.domElement = null;
    }

    protected override initializePanel(): void {
        if (this.domElement) return;

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
        this.domElement = panel;

        this.makePanelDraggable();
        this.makeHeaderMinimizable();

        const outfitHeaderDiv = queryOrThrow(this.domElement, HTMLDivElement, '.outfit-header');
        const outfitActionsDiv = this.createOutfitActions();

        outfitHeaderDiv.appendChild(outfitActionsDiv);
    }

    public override async exportButtonClickListener(): Promise<void> {
        const presetName = prompt('Name this export:');
        if (!presetName) return;

        const characterName = prompt(
            'Export for which character?\nAdd "_user" to the end to export to a persona.\n' +
            '(Leave blank to export as a global user preset)',
        );

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

        this.saveAndRenderContent();
    }

    protected override getHeaderTitle(): string {
        return `${this.outfitManager.character}'s Outfit`;
    }

    public updateCharacter(name: string): void {
        this.outfitManager.setCharacter(name);
        if (this.domElement && !this.minimized) {
            const header = this.domElement.querySelector('.outfit-header h3');
            if (header) header.textContent = `${name}'s Outfit`;
        }
        this.renderContent();
    }
}
