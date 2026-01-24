import { OutfitPanel } from './OutfitPanel.js';
import { mouseDragElement } from '../shared.js';
import { UserOutfitManager } from '../manager/UserOutfitManager.js';
import { OutfitTracker } from '../outfit/tracker.js';
import { queryOrThrow } from '../util/ElementHelper.js';

export class UserOutfitPanel extends OutfitPanel<UserOutfitManager> {
    public constructor(
        outfitManager: UserOutfitManager
    ) {
        super(outfitManager);
        this.isVisible = false;
        this.minimized = false;
        this.panelEl = null;
    }

    protected override initializePanel(): boolean {
        if (this.panelEl) return false;

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
        this.panelEl = panel;

        this.makePanelDraggable();
        this.makeHeaderMinimizable();

        const outfitHeaderDiv = queryOrThrow(this.panelEl, HTMLDivElement, '.outfit-header');
        const outfitActionsDiv = this.createOutfitActions();

        outfitHeaderDiv.appendChild(outfitActionsDiv);
        return true;
    }

    public override async exportButtonClickListener(): Promise<void> {
        const presetName = prompt('Name this export:');
        if (!presetName) return;

        const characterName = prompt(
            'Export for which character?\nAdd "_user" to the end to export to a persona.\n',
        );

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

    protected override getHeaderTitle(): string {
        return 'Your Outfit';
    }

    protected override getDefaultX(): number {
        return 20;
    }

    protected override getDefaultY(): number {
        return 50;
    }
}
