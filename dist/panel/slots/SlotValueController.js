import { isWideScreen, scrollIntoViewAboveKeyboard } from "../../shared.js";
import { popupConfirm } from "../../util/adapter/popup-adapter.js";
import { substituteParams } from "../../util/adapter/script-adapter.js";
import { addDoubleTapListener } from "../../util/element/click-actions.js";
import { addLongPressAction, createElement, el } from "../../util/ElementHelper.js";
import { EventBus } from "../../util/EventBus.js";
import { branch } from "../../util/logic.js";
import { OutfitPanelContext } from "../base/OutfitPanelContext.js";
function iterateMacros(value) {
    return (function* () {
        let i = 0;
        while (i < value.length) {
            // Find opening {{
            if (value[i] === '{' && value[i + 1] === '{') {
                const start = i;
                i += 2;
                let depth = 1;
                while (i < value.length && depth > 0) {
                    if (value[i] === '{' && value[i + 1] === '{') {
                        depth++;
                        i += 2;
                        continue;
                    }
                    if (value[i] === '}' && value[i + 1] === '}') {
                        depth--;
                        i += 2;
                        continue;
                    }
                    i++;
                }
                if (depth === 0) {
                    const end = i;
                    const full = value.slice(start, end);
                    const content = full.slice(2, -2);
                    yield {
                        full,
                        content,
                        index: start,
                        end
                    };
                }
                else {
                    // Unbalanced braces — stop parsing
                    break;
                }
            }
            else {
                i++;
            }
        }
    })();
}
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
        valueEl.replaceChildren(this.renderInlineCode(ctx.slot.value));
        addDoubleTapListener(valueEl, () => this.beginInlineEdit(ctx, valueEl));
        addLongPressAction(valueEl, 300, () => {
            const text = valueEl.textContent;
            const prompt = substituteParams(text);
            this.showPromptModal(prompt);
        }, { stopImmediatePropagation: true });
        valueEl.addEventListener('click', () => {
            valueEl.classList.toggle('--reveal');
            this.updateOverflowState(valueEl);
        });
        container.appendChild(valueEl);
        this.updateOverflowState(valueEl);
        this.renderBus.call(valueEl);
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
    renderInlineCode(value) {
        const frag = document.createDocumentFragment();
        const appendText = (start, end) => {
            const text = value.slice(start, end);
            frag.append(...this.renderTextWithRules(text));
        };
        let lastIndex = 0;
        for (const macro of iterateMacros(value)) {
            // Plain text before token
            if (macro.index > lastIndex) {
                appendText(lastIndex, macro.index);
            }
            const span = this.createMacroSpan(macro);
            frag.append(span);
            lastIndex = macro.end;
        }
        // Trailing text
        if (lastIndex < value.length) {
            appendText(lastIndex);
        }
        return frag;
    }
    renderTextWithRules(text) {
        const nodes = [];
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const rawLine = lines[i];
            const line = rawLine.trim();
            // --- Horizontal Rule
            if (line === '---') {
                const hr = el('hr', {
                    className: 'slot-value-hr'
                });
                nodes.push(hr);
            }
            // ### Header
            else if (line.startsWith('### ')) {
                const h3 = el('h3', {
                    className: 'slot-value-h3',
                    children: [
                        ...this.renderInlineFormatting(line.slice(4))
                    ]
                });
                nodes.push(h3);
            }
            // > Quote
            else if (line.startsWith('> ')) {
                const block = el('blockquote', {
                    className: 'slot-value-quote',
                    children: [
                        ...this.renderInlineFormatting(line.slice(2))
                    ]
                });
                nodes.push(block);
            }
            // Normal line
            else {
                nodes.push(...this.renderInlineFormatting(rawLine));
            }
            // Preserves line breaks (except for the last line)
            if (i < lines.length - 1) {
                nodes.push(document.createTextNode('\n'));
            }
        }
        return nodes;
    }
    renderInlineFormatting(text) {
        const nodes = [];
        const boldRegex = /\*\*(.*?)\*\*/g;
        let lastIndex = 0;
        let match;
        while ((match = boldRegex.exec(text)) !== null) {
            const [full, content] = match;
            const start = match.index;
            // Plain text before bold
            if (start > lastIndex) {
                nodes.push(document.createTextNode(text.slice(lastIndex, start)));
            }
            // Bold node
            const strong = el('strong', {
                className: 'slot-value-bold',
                text: content
            });
            nodes.push(strong);
            lastIndex = start + full.length;
        }
        // Trailing text
        if (lastIndex < text.length) {
            nodes.push(document.createTextNode(text.slice(lastIndex)));
        }
        return nodes;
    }
    createMacroSpan(macro) {
        // macro static content does not change until rerender
        const text = macro.full;
        const isOutlet = macro.content.startsWith('outlet::');
        const isNSFW = macro.content.startsWith('spoiler::');
        const span = el('span', {
            className: 'slot-macro-span',
            text
        });
        if (isNSFW) {
            const inner = macro.content.slice('spoiler::'.length);
            span.classList.add('--spoiler');
            const placeholder = el('span', {
                className: 'spoiler-placeholder',
                text: '[Spoiler]'
            });
            const content = el('span', {
                className: 'spoiler-content'
            });
            const nodes = this.renderMacroText(inner);
            content.append(...nodes);
            span.replaceChildren(placeholder, content);
            const toggleReveal = () => {
                span.classList.toggle('--revealed');
            };
            span.addEventListener('click', e => {
                e.stopPropagation();
                toggleReveal();
            });
            return span;
        }
        const getPrompt = () => {
            const prompt = substituteParams(text);
            return prompt === text ? null : prompt;
        };
        const updateFromPrompt = () => {
            span.classList.remove('--error', '--char', '--user');
            const addClass = (...tokens) => span.classList.add(...tokens);
            const prompt = getPrompt();
            if (!prompt) {
                span.title = 'Error: No Prompt Found';
                addClass('--error');
                return null;
            }
            span.title = prompt;
            if (isOutlet) {
                span.textContent = prompt;
                return prompt;
            }
            branch(macro.content)
                .on('char', 'user', () => span.textContent = prompt)
                .on('char', () => addClass('--char'))
                .on('user', () => addClass('--user'))
                .run(() => addClass('--unknown'));
            return prompt;
        };
        updateFromPrompt();
        if (isOutlet) {
            const key = macro.content.slice('outlet::'.length);
            span.classList.add('--outlet');
            span.dataset.outletKey = key;
        }
        addLongPressAction(span, 300, () => {
            const prompt = updateFromPrompt();
            if (!prompt)
                this.showPromptModal('No Prompt Found!');
            else
                this.showPromptModal(prompt);
        }, { stopImmediatePropagation: true });
        return span;
    }
    renderMacroText(text) {
        const nodes = [];
        let lastIndex = 0;
        for (const macro of iterateMacros(text)) {
            if (macro.index > lastIndex) {
                nodes.push(document.createTextNode(text.slice(lastIndex, macro.index)));
            }
            nodes.push(this.createMacroSpan(macro));
            lastIndex = macro.end;
        }
        if (lastIndex < text.length) {
            nodes.push(document.createTextNode(text.slice(lastIndex)));
        }
        return nodes;
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
                this.commitValueEdit(textarea, ctx.displaySlot.slot);
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
                        await this.outfitManager.setOutfitItem(ctx.slot.id, 'None');
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
            this.commitValueEdit(textarea, ctx.slot);
        });
        preventBlur(saveBtn);
        ctx.actionsRightEl.appendChild(saveBtn);
    }
    async commitValueEdit(textarea, slot) {
        const newValue = textarea.value.trim() === ''
            ? 'None'
            : textarea.value.trim();
        await this.outfitManager.setOutfitItem(slot.id, newValue);
        this.panel.saveAndRender();
    }
    cancelValueEdit() {
        this.panel.renderTabsAndActiveContent();
    }
}
