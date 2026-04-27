import { isWideScreen, scrollIntoViewAboveKeyboard } from "../../shared.js";
import { SlotValueText } from "../../ui/components/SlotValueText.js";
import { popupConfirm } from "../../util/adapter/popup-adapter.js";
import { substituteParams } from "../../util/adapter/script-adapter.js";
import { addDoubleTapListener } from "../../util/element/click-actions.js";
import { addLongPressAction, createElement, el } from "../../util/ElementHelper.js";
import { EventBus } from "../../util/EventBus.js";
import { OutfitPanelContext } from "../base/OutfitPanelContext.js";
export class SlotValueController extends OutfitPanelContext {
    constructor(panel, removeActionButtons) {
        super(panel);
        this.removeActionButtons = removeActionButtons;
        this.renderBus = new EventBus();
    }
    onRender(listener) {
        this.renderBus.add(listener);
        return this;
    }
    render(container, ctx) {
        const disabledClass = ctx.slot.isDisabled() ? 'disabled' : '';
        const noneClass = ctx.slot.isEmpty() ? 'none' : '';
        const valueEl = document.createElement('div');
        valueEl.classList.add('slot-value', ...[disabledClass, noneClass].filter(Boolean));
        const valueRenderer = new SlotValueText({
            showPromptModal: this.showPromptModal.bind(this),
            expandValue: () => {
                valueEl.classList.add('--reveal');
                this.updateOverflowState(valueEl);
            }
        });
        valueEl.replaceChildren(valueRenderer.createFrag(ctx.slot.value));
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
        return valueEl;
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
        valueEl.hidden = false;
        const scrollTop = ctx.scroller.scrollTop;
        const rect = valueEl.getBoundingClientRect();
        const originalValue = ctx.slot.value;
        const empty = originalValue === 'None';
        // Create editable textarea
        const textarea = document.createElement('textarea');
        textarea.className = 'slot-editbox';
        textarea.rows = 1;
        textarea.value = empty ? '' : originalValue;
        textarea.style.width = `${rect.width}px`;
        textarea.style.height = `${rect.height}px`;
        // Swap value box with editor
        valueEl.replaceWith(textarea);
        ctx.scroller.scrollTop = scrollTop;
        const autoResize = () => {
            const prevScroll = ctx.scroller.scrollTop;
            // Temporarily reset height to allow shrink
            textarea.style.height = '0px';
            const next = textarea.scrollHeight;
            textarea.style.height = `${next}px`;
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
        this.removeActionButtons(ctx);
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
                        await this.outfitManager.updateSlotValue(ctx.slot.id, 'None');
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
    }
    async commitValueEdit(textarea, slot) {
        const newValue = textarea.value.trim() === ''
            ? 'None'
            : textarea.value.trim();
        await this.outfitManager.updateSlotValue(slot.id, newValue);
        this.panel.saveAndRender();
    }
    cancelValueEdit() {
        this.panel.renderTabsAndActiveContent();
    }
}
