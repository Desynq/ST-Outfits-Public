import { ChatOutfitStorage } from "../../api/chat-metadata.js";
import { isWideScreen, scrollIntoViewAboveKeyboard } from "../../shared.js";
import { SlotValueText } from "../../ui/components/SlotValueText.js";
import { popupConfirm } from "../../util/adapter/popup-adapter.js";
import { substituteParams } from "../../util/adapter/script-adapter.js";
import { addDoubleTapListener } from "../../util/element/click-actions.js";
import { addLongPressAction, createElement, el } from "../../util/ElementHelper.js";
import { EventBus } from "../../util/EventBus.js";
import { OutfitPanelContext } from "../base/OutfitPanelContext.js";
export class SlotValueController extends OutfitPanelContext {
    constructor(deps) {
        super(deps.panel);
        this.deps = deps;
        this.renderBus = new EventBus();
        this.editBus = new EventBus();
    }
    onRender(listener) {
        this.renderBus.add(listener);
        return this;
    }
    onEdit(listener) {
        this.editBus.add(listener);
        return this;
    }
    render(container, ctx) {
        const disabledClass = ctx.slot.isDisabled() ? 'disabled' : '';
        const noneClass = this.isEmpty(ctx.slot) ? 'none' : '';
        const valueEl = el('div', {
            className: this.getValueElClassName(),
            classes: [disabledClass, noneClass].filter(Boolean)
        });
        const valueRenderer = new SlotValueText({
            showPromptModal: this.showPromptModal.bind(this),
            expandValue: () => {
                valueEl.classList.add('--reveal');
                this.updateOverflowState(valueEl);
            }
        });
        valueEl.replaceChildren(valueRenderer.createFrag(this.getSlotText(ctx.slot)));
        addDoubleTapListener(valueEl, () => this.beginInlineEdit(ctx, valueEl));
        addLongPressAction(valueEl, 300, () => {
            const text = valueEl.textContent;
            const prompt = substituteParams(text);
            void this.showPromptModal(prompt);
        }, { stopImmediatePropagation: true });
        valueEl.addEventListener('click', () => {
            valueEl.classList.toggle('--reveal');
            this.updateOverflowState(valueEl);
        });
        container.appendChild(valueEl);
        this.updateOverflowState(valueEl);
        this.renderBus.emit(valueEl);
        return {
            valueEl
        };
    }
    updateOverflowState(el) {
        requestAnimationFrame(() => {
            const wasRevealed = el.classList.contains('--reveal');
            if (wasRevealed) {
                el.classList.remove('--overflowing');
                return;
            }
            const isOverflowing = el.scrollHeight > el.clientHeight;
            el.classList.toggle('--overflowing', isOverflowing);
        });
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
    beginInlineEdit(ctx, valueEl) {
        if (!this.deps.editCoordinator.canEdit(valueEl))
            return false;
        this.deps.editCoordinator.beginEdit(valueEl);
        valueEl.hidden = false;
        const scrollTop = ctx.scroller.scrollTop;
        const rect = valueEl.getBoundingClientRect();
        const originalValue = this.getSlotText(ctx.slot);
        const empty = this.isEmpty(ctx.slot);
        // Create editable textarea
        const textarea = el('textarea', {
            className: this.getEditBoxClassName(),
            rows: 1,
            value: empty ? '' : originalValue,
        });
        textarea.style.width = `${rect.width}px`;
        textarea.style.minHeight = `${rect.height}px`;
        // Swap value box with editor
        valueEl.replaceWith(textarea);
        ctx.scroller.scrollTop = scrollTop;
        const autoResize = () => {
            const prevScroll = ctx.scroller.scrollTop;
            // Temporarily reset height to allow shrink
            textarea.style.minHeight = '0px';
            const next = textarea.scrollHeight;
            textarea.style.minHeight = `${next}px`;
            // Restore scroll to prevent browser compensation
            ctx.scroller.scrollTop = prevScroll;
        };
        autoResize();
        textarea.focus({ preventScroll: true });
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        requestAnimationFrame(() => {
            scrollIntoViewAboveKeyboard(ctx.scroller, textarea);
        });
        const vv = window.visualViewport;
        const onVvChange = () => scrollIntoViewAboveKeyboard(ctx.scroller, textarea);
        vv?.addEventListener('resize', onVvChange);
        vv?.addEventListener('scroll', onVvChange);
        const cleanup = () => {
            vv?.removeEventListener('resize', onVvChange);
            vv?.removeEventListener('scroll', onVvChange);
        };
        this.deps.removeActionButtons(ctx);
        textarea.addEventListener('keydown', (e) => {
            if (e.isComposing)
                return;
            if (isWideScreen() && e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void this.commitValueEdit(textarea, ctx.displaySlot.slot);
            }
            else if (e.key === 'Escape') {
                e.preventDefault();
                this.cancelValueEdit();
            }
        });
        const preventBlur = (btn) => btn.addEventListener('pointerdown', e => e.preventDefault());
        if (!empty) {
            const clearBtn = el('button', {
                className: 'slot-button clear-button',
                text: 'Clear',
                events: {
                    click: async () => {
                        await this.updateSlotText(ctx.slot, this.getEmptyText());
                        cleanup();
                        this.panel.renderTabsAndActiveContent();
                    }
                },
                parent: ctx.actionsLeftEl
            });
        }
        const tokenCounter = el('div', {
            className: 'slot-token-count',
            parent: ctx.actionsLeftEl
        });
        const updateTokenCount = () => tokenCounter.textContent = `Tokens:\n${Math.ceil(textarea.value.length / 4)}`;
        updateTokenCount();
        textarea.addEventListener('input', () => {
            autoResize();
            updateTokenCount();
        });
        const cancelBtn = document.createElement('button');
        cancelBtn.classList.add('slot-button', 'cancel-button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', () => {
            cleanup();
            this.cancelValueEdit();
        });
        preventBlur(cancelBtn);
        ctx.actionsRightEl.appendChild(cancelBtn);
        const saveBtn = document.createElement('button');
        saveBtn.classList.add('slot-button', 'save-button');
        saveBtn.textContent = 'Save';
        saveBtn.addEventListener('click', async () => {
            cleanup();
            void this.commitValueEdit(textarea, ctx.slot);
        });
        preventBlur(saveBtn);
        ctx.actionsRightEl.appendChild(saveBtn);
        return true;
    }
    async commitValueEdit(textarea, slot) {
        const text = textarea.value.trim() === ''
            ? this.getEmptyText()
            : textarea.value.trim();
        await this.updateSlotText(slot, text);
        this.panel.saveAndRender();
    }
    cancelValueEdit() {
        this.panel.renderTabsAndActiveContent();
    }
    getValueElClassName() {
        return 'slot-value slot-textbox';
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
    async updateSlotText(slot, text) {
        await this.outfitManager.updateSlotValue(slot.id, text);
    }
    getEmptyText() {
        return 'None';
    }
}
export class SlotChatAddendumController extends SlotValueController {
    getValueElClassName() {
        return 'slot-addendum slot-textbox';
    }
    getEditBoxClassName() {
        return 'slot-editbox';
    }
    getSlotText(slot) {
        return ChatOutfitStorage.getAddendum(this.getCharacter(), slot.id) ?? this.getEmptyText();
    }
    async updateSlotText(slot, text) {
        if (!text || text === this.getEmptyText()) {
            ChatOutfitStorage.removeAddendum(this.getCharacter(), slot.id);
            return;
        }
        ChatOutfitStorage.saveAddendum(this.getCharacter(), slot.id, text);
    }
    getEmptyText() {
        return '(+)';
    }
    getCharacter() {
        return this.panel.outfitManager.getName();
    }
}
