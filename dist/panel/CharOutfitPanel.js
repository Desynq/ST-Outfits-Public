import { OutfitTracker } from "../data/tracker.js";
import { CharOutfitManager } from "../manager/CharOutfitManager.js";
import { el } from "../util/ElementHelper.js";
import { EventBus } from "../util/EventBus.js";
import { fromKebabCase } from "../util/StringHelper.js";
import { OutfitPanel } from "./OutfitPanel.js";
export class CharOutfitPanel extends OutfitPanel {
    constructor(outfitManager, grouper, getCurrentCharacterKey) {
        super(outfitManager);
        this.grouper = grouper;
        this.getCurrentCharacterKey = getCurrentCharacterKey;
        this.destroyBus = new EventBus();
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
        this.makePanelDraggable();
        this.makeHeaderMinimizable();
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
    createOutfitActions() {
        const actionsEl = super.createOutfitActions();
        const button = el('span', {
            className: 'outfit-action switch-panel-button no-highlight',
            text: '▼',
            events: {
                click: () => {
                    openMenu();
                }
            }
        });
        const menu = el('div', {
            className: 'panel-switch-menu'
        });
        const rebuildMenu = () => {
            const panels = this.grouper.getGroup(this);
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
                const loadState = panel.getPanelSettings().getLoadState();
                const lock = el('span', {
                    className: `panel-switch-lock`,
                    text: {
                        'chat': '📖',
                        'global': '🌐',
                        'character': '👤'
                    }[loadState]
                });
                // lock.classList.toggle('is-hidden', canLoad);
                const label = el('span', {
                    className: 'panel-switch-label',
                    text: panel.getHeaderTitle()
                });
                const option = el('div', {
                    className: 'panel-switch-option',
                    events: {
                        click: () => {
                            menu.classList.remove('--open');
                            this.grouper.focus(panel);
                        }
                    },
                    children: [lock, label, remove]
                });
                option.classList.toggle('is-current-panel', panel === this);
                const s = panel.getPanelSettings();
                option.style.setProperty('--panel-bg-1', s.bgColor1);
                option.style.setProperty('--panel-bg-2', s.bgColor2);
                option.style.setProperty('--panel-border', s.borderColor);
                return option;
            });
            menu.replaceChildren(...optionEls);
        };
        button.addEventListener('click', rebuildMenu);
        const positionMenu = () => {
            menu.style.left = '0px';
            menu.style.right = 'auto';
            const menuRect = menu.getBoundingClientRect();
            const panelRect = this.getBoundingClientRect();
            const overflowRight = menuRect.right - panelRect.right;
            if (overflowRight > 0) {
                menu.style.left = `${-overflowRight - 8}px`;
            }
            const adjustedRect = menu.getBoundingClientRect();
            if (adjustedRect.left < 8) {
                menu.style.left = `${parseFloat(menu.style.left || '0') + (8 - adjustedRect.left)}px`;
            }
        };
        const openMenu = () => {
            rebuildMenu();
            menu.classList.toggle('--open');
            positionMenu();
        };
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
        this.grouper.onGroupAppend(this.characterKey, groupAppend);
        this.grouper.onGroupRemove(this.characterKey, groupRemove);
        this.grouper.onGroupFocus(this.characterKey, groupFocus);
        if (this.grouper.getGroup(this).length === 0) {
            dropdown.hidden = true;
        }
        actionsEl.prepend(dropdown);
        return actionsEl;
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
        this.outfitManager.savePreset(name);
        return true;
    }
    loadFromCharacter() {
        if (this.getPanelSettings().getLoadState() !== 'character')
            return false;
        const ck = this.getCurrentCharacterKey();
        if (ck === null)
            return false;
        const name = `@character:${ck}`;
        const result = this.outfitManager.loadPreset(name);
        if (result === 'not-found') {
            this.outfitManager.getOutfitCollection().clearCurrentOutfit();
        }
        this.renderTabsAndActiveContent();
        return true;
    }
}
