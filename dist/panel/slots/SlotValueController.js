import { getCurrentCharacterKey } from "../../api/character-provider.js";
import { ChatOutfitStorage } from "../../api/chat-metadata.js";
import * as SlotPresetsApi from "../../api/internal/slot-preset.js";
import { CHARACTER_NOTE_OPTIONS } from "../../Constants.js";
import { OutfitTracker } from "../../data/tracker.js";
import { SlotTextbox } from "../../ui/components/slot/slot-textbox.js";
import { SlotValueText } from "../../ui/components/SlotValueText.js";
import { promptConfigureSlotIcons } from "../../ui/prompt/configure-slot-icons.js";
import { popupConfirm } from "../../util/adapter/popup-adapter.js";
import { substituteParams } from "../../util/adapter/script-adapter.js";
import { addDoubleTapListener, onSingleClick } from "../../util/element/click-actions.js";
import { mergeClassNames, triggerAfterLayout, triggerAfterTransition } from "../../util/element/css.js";
import { addLongPressAction, createElement, el } from "../../util/ElementHelper.js";
import { EventBus } from "../../util/EventBus.js";
import { exact } from "../../util/narrowing.js";
import { stringIf } from "../../util/StringHelper.js";
import { OutfitPanelContext } from "../base/OutfitPanelContext.js";
import { getSlotIcon } from "./slot-icon.js";
export class SlotTextboxFactory extends OutfitPanelContext {
    constructor(deps) {
        super(deps.panel);
        this.deps = deps;
        this.renderBus = new EventBus();
    }
    onRender(listener) {
        this.renderBus.add(listener);
        return this;
    }
    render(container, ctx) {
        const { rootEl, valueEl: textboxEl } = this.createValueElements(ctx);
        const textbox = new SlotTextbox(rootEl, textboxEl, {
            ctx,
            editCoordinator: this.deps.editCoordinator,
            removeActionButtons: this.deps.removeActionButtons,
            getOriginalText: () => this.getSlotText(ctx.slot),
            getEmptyText: () => this.getEmptyText(),
            isEmpty: () => this.isEmpty(ctx.slot),
            getEditBoxClassName: () => this.getEditBoxClassName(),
            onCommit: (text) => {
                this.updateSlotText(ctx.slot, text);
                this.panel.saveAndRender();
            },
            onCancel: () => {
                this.panel.renderTabsAndActiveContent();
            }
        });
        const valueRenderer = new SlotValueText({
            showPromptModal: this.showPromptModal.bind(this),
            expandValue: () => {
                textboxEl.classList.add('--reveal');
                this.updateOverflowState(textboxEl);
            }
        });
        // set text
        textboxEl.replaceChildren(valueRenderer.createFrag(this.getSlotText(ctx.slot), ctx.slot.kind));
        addDoubleTapListener(textboxEl, () => textbox.beginInlineEdit());
        addLongPressAction(textboxEl, 300, () => {
            const text = textboxEl.textContent;
            const prompt = substituteParams(text);
            void this.showPromptModal(prompt);
        }, { stopImmediatePropagation: true });
        onSingleClick(textboxEl, () => {
            textboxEl.classList.toggle('--reveal');
            this.updateOverflowState(textboxEl);
        });
        container.appendChild(rootEl);
        triggerAfterLayout(textboxEl, () => this.updateOverflowState(textboxEl));
        this.renderBus.emit({
            ctx,
            valueEl: textboxEl,
            isFor: (otherCtx) => otherCtx.slot.id === ctx.slot.id
        });
        return {
            rootEl,
            textboxEl,
            textbox
        };
    }
    createThumbFromName({ rootEl, ctx }) {
        const character = getCurrentCharacterKey();
        const collection = this.outfitManager.getOutfitCollection();
        const hasNote = (type) => !!character
            && !!collection.getCharacterNoteText(character, ctx.slot.id, type);
        const icon = getSlotIcon(ctx.slot.id, hasNote, OutfitTracker.getSlotIconRules());
        if (!icon)
            return;
        const thumb = el('div', {
            className: mergeClassNames('slot-textbox-thumb', icon),
            parent: rootEl
        });
        onSingleClick(thumb, async () => {
            await promptConfigureSlotIcons({
                onSave: () => {
                    this.panel.renderTabsAndActiveContent();
                }
            });
        });
    }
    createValueElements(ctx) {
        const rootEl = el('div', {
            className: 'slot-value-container'
        });
        this.createThumbFromName({ rootEl, ctx });
        const valueEl = el('div', {
            className: 'slot-value slot-textbox',
            classes: [
                stringIf(ctx.slot.isDisabled(), 'disabled'),
                stringIf(this.isEmpty(ctx.slot), 'none')
            ],
            parent: rootEl
        });
        return {
            rootEl,
            valueEl
        };
    }
    setCollapsedMaxHeight(valueEl, height) {
        if (height === null) {
            valueEl.style.removeProperty('--collapsed-max-height');
        }
        else {
            valueEl.style.setProperty('--collapsed-max-height', `${height}px`);
        }
        triggerAfterTransition(valueEl, 'max-height', () => this.updateOverflowState(valueEl));
    }
    updateOverflowState(el) {
        if (el.classList.contains('--reveal')) {
            el.classList.remove('--overflowing');
            return;
        }
        const isActuallyOverflowing = el.scrollHeight - el.clientHeight > 1;
        const isVisuallyLarge = this.isHeightAboveDefault(el);
        el.classList.toggle('--overflowing', isActuallyOverflowing || isVisuallyLarge);
    }
    isHeightAboveDefault(el) {
        const style = getComputedStyle(el);
        const lineHeight = parseFloat(style.lineHeight);
        const defaultMaxHeight = (lineHeight * 6) + 12;
        const height = el.getBoundingClientRect().height;
        return height > defaultMaxHeight + 1; // +1 to dodge subpixel noise
    }
    async showPromptModal(promptText) {
        const container = createElement('div', 'flex-container flexFlowColumn height100p');
        const textarea = createElement('textarea', 'flex1 monospace textarea_compact');
        textarea.value = promptText;
        textarea.readOnly = true;
        textarea.style.resize = 'none';
        textarea.style.maxHeight = '90dvh';
        container.append(textarea);
        await popupConfirm(container, {
            title: 'Prompt',
            wide: true,
            cancelText: false,
            leftAlign: true,
            large: true
        });
    }
    getEditBoxClassName() {
        return 'slot-editbox';
    }
    getSlotText(slot) {
        return slot.value;
    }
    isEmpty(slot) {
        return this.getSlotText(slot) === this.getEmptyText();
    }
    updateSlotText(slot, text) {
        this.syncPresetFromEditedValue(slot, text);
        this.outfitManager.updateSlotValue(slot.id, text);
    }
    syncPresetFromEditedValue(slot, text) {
        if (!SlotPresetsApi.canSync(slot))
            return;
        const step = SlotPresetsApi.beginSaveSlotAsPresetAuto({
            slot: {
                id: slot.id,
                value: text,
                getActiveImageState: () => slot.getActiveImageState(),
                hasPreset: (preset) => slot.hasPreset(preset)
            }
        });
        if (step.type !== 'ready')
            return;
        step.save();
        toastr.info(`Synced ${slot.id} slot to preset ${step.preset.key}.`);
    }
    getEmptyText() {
        return 'None';
    }
}
export class SlotChatNoteFactory extends SlotTextboxFactory {
    getEditBoxClassName() {
        return 'slot-editbox';
    }
    createValueElements(ctx) {
        const rootEl = el('div', {
            className: 'slot-chat-note-container',
        });
        const thumbEl = el('div', {
            className: 'slot-textbox-thumb fa-solid fa-comments',
            parent: rootEl
        });
        const valueEl = el('div', {
            className: 'slot-chat-note-textbox slot-textbox',
            classes: [
                stringIf(ctx.slot.isDisabled(), 'disabled'),
                stringIf(this.isEmpty(ctx.slot), 'none')
            ],
            parent: rootEl
        });
        return {
            rootEl,
            valueEl
        };
    }
    getSlotText(slot) {
        return ChatOutfitStorage.getNote(this.getCharacter(), slot.id) ?? this.getEmptyText();
    }
    updateSlotText(slot, text) {
        if (!text || text === this.getEmptyText()) {
            ChatOutfitStorage.deleteNote(this.getCharacter(), slot.id);
            this.outfitManager.updateSlotContext(slot.id);
            return;
        }
        ChatOutfitStorage.setNote(this.getCharacter(), slot.id, text);
        this.outfitManager.updateSlotContext(slot.id);
    }
    getEmptyText() {
        return '(+)';
    }
    getCharacter() {
        return this.panel.outfitManager.getName();
    }
}
export class SlotCharacterNoteFactory extends SlotTextboxFactory {
    constructor(deps, options) {
        super(deps);
        this.options = options;
    }
    getAddButtonOptions() {
        return {
            className: 'slot-button slot-add-character-note-button',
            text: this.options.add_button_text
        };
    }
    getEditBoxClassName() {
        return 'slot-editbox';
    }
    createValueElements(ctx) {
        const rootEl = el('div', {
            className: 'slot-character-note-container',
        });
        const thumbEl = el('div', {
            className: mergeClassNames('slot-textbox-thumb', this.options.icon),
            parent: rootEl
        });
        const valueEl = el('div', {
            className: 'slot-character-note-textbox slot-textbox',
            classes: [
                stringIf(ctx.slot.isDisabled(), 'disabled'),
                stringIf(this.isEmpty(ctx.slot), 'none')
            ],
            parent: rootEl
        });
        return {
            rootEl,
            valueEl
        };
    }
    getSlotText(slot) {
        let note;
        const character = getCurrentCharacterKey();
        if (character) {
            note = this.outfitManager
                .getOutfitCollection()
                .getCharacterNoteText(character, slot.id, this.options.type);
        }
        return note ?? this.getEmptyText();
    }
    updateSlotText(slot, text) {
        const collection = this.outfitManager.getOutfitCollection();
        const character = getCurrentCharacterKey();
        if (!character) {
            throw new Error('Cannot edit character note without a character.');
        }
        if (!text || text === this.getEmptyText()) {
            collection.deleteCharacterNote(character, slot.id, this.options.type);
            this.outfitManager.updateSlotContext(slot.id);
            return;
        }
        collection.setCharacterNote(character, slot.id, text, this.options.type);
        this.outfitManager.updateSlotContext(slot.id);
    }
    getEmptyText() {
        return '';
    }
}
export function createCharacterNoteFactories(deps) {
    return Object.entries(CHARACTER_NOTE_OPTIONS).map(([type, { context_label, ...options }]) => new SlotCharacterNoteFactory(deps, exact()({
        ...options,
        type: type
    })));
}
