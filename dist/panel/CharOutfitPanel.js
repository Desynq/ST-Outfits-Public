import { OutfitTracker } from "../data/tracker.js";
import { CharOutfitManager } from "../manager/CharOutfitManager.js";
import { el } from "../util/ElementHelper.js";
import { EventBus } from "../util/EventBus.js";
import { fromKebabCase } from "../util/StringHelper.js";
import { OutfitPanel } from "./OutfitPanel.js";
export class CharOutfitPanel extends OutfitPanel {
    constructor(outfitManager, grouper) {
        super(outfitManager);
        this.grouper = grouper;
        this.destroyBus = new EventBus();
    }
    static from(character, saveSettings, grouper) {
        const manager = new CharOutfitManager(saveSettings, character);
        const panel = new CharOutfitPanel(manager, grouper);
        manager.setFullSummaryTagResolver(() => panel.getPanelSettings().getFullSummaryTag());
        return panel;
    }
    onDestroy(listener) {
        this.destroyBus.add(listener);
        return this;
    }
    get character() {
        return this.outfitManager.character;
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
    show(options = {}) {
        if (!super.show(options))
            return false;
        this.panelsView.setActive(this.character);
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
        this.panelsView.removeActive(this.character);
        this.outfitManager.saveSettings();
        this.destroyBus.emit();
    }
    createOutfitActions() {
        const actionsEl = super.createOutfitActions();
        const button = el('span', {
            className: 'outfit-action switch-panel-button no-highlight',
            text: '▼',
            events: {
                click: () => {
                    menu.classList.toggle('--open');
                }
            }
        });
        const menu = el('div', {
            className: 'panel-switch-menu'
        });
        const rebuildMenu = () => {
            const panels = this.grouper.getGroup(this).filter(p => p !== this);
            const optionEls = panels.map(panel => {
                const remove = el('span', {
                    className: 'panel-switch-remove no-highlight',
                    text: '-',
                    events: {
                        click: (e) => {
                            e.stopPropagation();
                            this.grouper.ungroup(panel);
                            rebuildMenu();
                        }
                    }
                });
                const label = el('span', {
                    className: 'panel-switch-label',
                    text: panel.getHeaderTitle()
                });
                return el('div', {
                    className: 'panel-switch-option',
                    events: {
                        click: () => {
                            menu.classList.remove('--open');
                            this.grouper.focus(panel);
                        }
                    },
                    children: [label, remove]
                });
            });
            menu.replaceChildren(...optionEls);
        };
        button.addEventListener('click', rebuildMenu);
        const dropdown = el('div', {
            className: 'panel-switch-dropdown',
            tabIndex: 0,
            children: [button, menu],
            events: {
                focusout: () => {
                    menu.classList.remove('--open');
                    menu.replaceChildren();
                }
            }
        });
        const groupAppend = (parent, child) => {
            if (parent !== this)
                return;
            dropdown.hidden = false;
        };
        const groupFocus = (panel) => {
            if (panel !== this)
                return;
            dropdown.hidden = false;
        };
        const groupRemove = (panel) => {
            if (panel !== this)
                return;
            dropdown.hidden = true;
        };
        this.grouper.onGroupAppend(this.character, groupAppend);
        this.grouper.onGroupRemove(this.character, groupRemove);
        this.grouper.onGroupFocus(this.character, groupFocus);
        if (this.grouper.getGroup(this).length === 0) {
            dropdown.hidden = true;
        }
        actionsEl.prepend(dropdown);
        return actionsEl;
    }
}
