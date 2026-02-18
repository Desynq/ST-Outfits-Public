import { OutfitPanel } from './OutfitPanel.js';
import { dragElement } from '../shared.js';
import { UserOutfitManager } from '../manager/UserOutfitManager.js';
import { OutfitTracker } from '../outfit/tracker.js';

export class UserOutfitPanel extends OutfitPanel<UserOutfitManager> {
    constructor(
        outfitManager: UserOutfitManager,
        saveSettingsDebounced: Function
    ) {
        super(outfitManager, saveSettingsDebounced);
        this.isVisible = false;
        this.minimized = false;
        this.domElement = null;
    }

    initializePanel() {
        if (this.domElement) return;

        const panel = document.createElement('div');
        panel.id = 'user-outfit-panel';
        panel.className = 'outfit-panel';

        /*html*/
        panel.innerHTML = `
            <div class="outfit-header">
                <h3>${this.getHeaderTitle()}</h3>
                <div class="outfit-actions">
                    <span class="outfit-action hide-empty-button    no-highlight">◌</span>
                    <span class="outfit-action hide-disabled-button no-highlight" id="user-outfit-visibility">⦰</span>
                    <span class="outfit-action minimize-button      no-highlight" id="bot-outfit-minimize">−</span>
                    <span class="outfit-action refresh-button       no-highlight" id="bot-outfit-refresh">↻</span>
                    <span class="outfit-action close-button         no-highlight" id="bot-outfit-close">×</span>
                </div>
            </div>
            <div class="outfit-tabs"></div>
            <div class="outfit-content" id="user-outfit-tab-content"></div>
        `;

        document.body.appendChild(panel);
        this.domElement = panel;

        this.makePanelDraggable();
        this.makeHeaderMinimizable();

        dragElement($(this.domElement));

        this.domElement.querySelector('.hide-disabled-button')!.addEventListener('click', () => {
            this.toggleHideDisabled();
        });

        this.domElement.querySelector('.hide-empty-button')!.addEventListener('click', () => {
            this.toggleHideEmpty();
        });

        this.domElement.querySelector('.minimize-button')!.addEventListener('click', () => {
            this.toggleMinimize();
        });

        this.domElement.querySelector('.refresh-button')!.addEventListener('click', () => {
            this.outfitManager.initializeOutfit();
            this.renderContent();
        });

        this.domElement.querySelector('.close-button')!.addEventListener('click', () => {
            this.hide();
        });
    }

    public async exportButtonClickListener() {
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

        this.saveSettingsDebounced();
        this.renderContent();
    }

    toggle() {
        this.isVisible ? this.hide() : this.show();
    }

    getHeaderTitle() {
        return 'Your Outfit';
    }

    show() {
        this.initializePanel();

        this.renderContent();
        this.domElement!.style.display = 'flex';
        this.isVisible = true;
    }

    hide() {
        if (this.domElement) {
            this.domElement.style.display = 'none';
        }
        this.isVisible = false;
        this.minimized = false;
    }
}
