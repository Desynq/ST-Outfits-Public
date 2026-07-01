import { isWideScreen, scrollIntoViewAboveKeyboard } from "../../../shared.js";
import { el } from "../../../util/ElementHelper.js";
export class SlotTextbox {
    constructor(rootEl, textboxEl, deps) {
        this.rootEl = rootEl;
        this.textboxEl = textboxEl;
        this.deps = deps;
    }
    isHidden() {
        return this.rootEl.hidden !== false;
    }
    hide() {
        this.rootEl.hidden = true;
    }
    isEmpty() {
        return this.deps.getOriginalText() === this.deps.getEmptyText();
    }
    beginInlineEdit() {
        const { ctx, editCoordinator, removeActionButtons, getOriginalText, getEmptyText, isEmpty, getEditBoxClassName, onCommit, onCancel } = this.deps;
        if (!editCoordinator.canEdit(this.textboxEl))
            return false;
        editCoordinator.beginEdit(this.textboxEl);
        this.rootEl.hidden = false;
        const scrollTop = ctx.scroller.scrollTop;
        const rect = this.textboxEl.getBoundingClientRect();
        const originalValue = getOriginalText();
        const empty = isEmpty();
        const textarea = el('textarea', {
            className: getEditBoxClassName(),
            rows: 1,
            value: empty ? '' : originalValue,
        });
        textarea.style.height = `${rect.height}px`;
        this.textboxEl.replaceWith(textarea);
        ctx.scroller.scrollTop = scrollTop;
        const resizeTextarea = () => {
            const prevScroll = ctx.scroller.scrollTop;
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
            ctx.scroller.scrollTop = prevScroll;
        };
        resizeTextarea();
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
        const commit = () => {
            const text = textarea.value.trim() === ''
                ? getEmptyText()
                : textarea.value.trim();
            cleanup();
            onCommit(text);
        };
        const cancel = () => {
            cleanup();
            onCancel();
        };
        removeActionButtons(ctx);
        textarea.addEventListener('keydown', (e) => {
            if (e.isComposing)
                return;
            if (isWideScreen() && e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                commit();
            }
            else if (e.key === 'Escape') {
                e.preventDefault();
                cancel();
            }
        });
        const preventBlur = (btn) => {
            btn.addEventListener('pointerdown', e => e.preventDefault());
        };
        if (!empty) {
            const clearBtn = el('button', {
                className: 'slot-button clear-button',
                text: 'Clear',
                events: {
                    click: () => {
                        commit();
                    }
                }
            });
            preventBlur(clearBtn);
        }
        const tokenCounter = el('div', {
            className: 'slot-token-count',
            parent: ctx.actionsLeftEl
        });
        const updateTokenCount = () => tokenCounter.textContent = `Tokens:\n${Math.ceil(textarea.value.length / 4)}`;
        updateTokenCount();
        textarea.addEventListener('input', () => {
            resizeTextarea();
            updateTokenCount();
        });
        const cancelBtn = el('button', {
            className: 'slot-button cancel-button',
            text: 'Cancel',
            events: {
                click: cancel
            },
            parent: ctx.actionsRightEl
        });
        const saveBtn = el('button', {
            className: 'slot-button save-button',
            text: 'Save',
            events: {
                click: () => commit()
            },
            parent: ctx.actionsRightEl
        });
        preventBlur(saveBtn);
        return true;
    }
}
