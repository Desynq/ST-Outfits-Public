import { assertNever, isWideScreen, scrollIntoViewAboveKeyboard, toSlotName } from "../shared.js";
import { addDoubleTapListener } from "../util/element/click-actions.js";
import { addLongPressAction, appendElement, createElement } from "../util/ElementHelper.js";
import { substituteParams } from "../util/adapter/script-adapter.js";
import { popupConfirm } from "../util/adapter/popup-adapter.js";
import { branch } from "../util/logic.js";
function iterateMacros(value) {
    const regex = /\{\{(.+?)\}\}/g;
    return (function* () {
        for (const match of value.matchAll(regex)) {
            const full = match[0];
            const content = match[1];
            const index = match.index;
            yield {
                full,
                content,
                index,
                end: index + full.length
            };
        }
    })();
}
class DisplaySlot {
    constructor(displayIndex, slotIndex, slot) {
        this.displayIndex = displayIndex;
        this.slotIndex = slotIndex;
        this.slot = slot;
    }
}
export class SlotsRenderer {
    constructor(panel) {
        this.panel = panel;
        this.currentDisplaySlots = [];
    }
    get outfitManager() {
        return this.panel.getOutfitManager();
    }
    get outfitView() {
        return this.outfitManager.getOutfitView();
    }
    renderSlots(kind, slots, container) {
        const resolvedSlots = this.outfitView.resolve(slots);
        const displaySlots = [];
        let displayIndex = 1;
        for (const slot of resolvedSlots) {
            if (!slot.resolved) {
                console.warn(`Slot ${slot.id} failed to resolve`);
                continue;
            }
            const slotIndex = this.outfitView.getIndexById(slot.id);
            const displaySlot = new DisplaySlot(displayIndex, slotIndex, slot);
            displaySlots.push(displaySlot);
            this.renderSlot(container, displaySlot);
            displayIndex++;
        }
        this.currentDisplaySlots = displaySlots;
        this.renderAddSlotButton(container, kind);
    }
    renderAddSlotButton(container, kind) {
        const addSlotButton = document.createElement('button');
        addSlotButton.className = 'add-slot-button';
        addSlotButton.textContent = 'Add Slot';
        addSlotButton.addEventListener('click', () => this.addSlot(container, kind));
        container.appendChild(addSlotButton);
    }
    addSlot(container, kind) {
        const id = prompt('Name?')?.trim();
        if (!id) {
            this.panel.render();
            return;
        }
        const duplicate = !this.outfitView.addSlot(id, kind);
        if (duplicate) {
            this.panel.sendSystemMessage(`Slot with id ${id} already exists.`);
            return;
        }
        this.outfitManager.updateOutfitValue(id);
        this.panel.saveAndRender();
    }
    renderSlot(container, display) {
        const slot = display.slot;
        const slotElement = document.createElement('div');
        slotElement.className = 'outfit-slot';
        slotElement.dataset.slot = display.slot.id;
        const labelDiv = appendElement(slotElement, 'div', 'slot-label');
        const labelLeftDiv = appendElement(labelDiv, 'div', 'slot-label-left');
        const labelRightDiv = appendElement(labelDiv, 'div', 'slot-label-right');
        appendElement(labelLeftDiv, 'div', 'slot-ordinal', display.displayIndex.toString());
        const slotNameEl = appendElement(labelLeftDiv, 'div', 'slot-name', toSlotName(slot.id));
        const actionsEl = document.createElement('div');
        actionsEl.className = 'slot-actions';
        const actionsLeftEl = appendElement(actionsEl, 'div', 'slot-actions-left');
        const actionsRightEl = appendElement(actionsEl, 'div', 'slot-actions-right');
        const ctx = {
            scroller: container,
            displaySlot: display,
            slotElement,
            slot,
            actionsLeftEl,
            actionsRightEl,
            labelLeftDiv,
            labelRightDiv,
            slotNameEl
        };
        const mode = this.getSlotRenderMode(slot, this.panel);
        addDoubleTapListener(slotNameEl, () => this.beginRename(slotNameEl, ctx));
        const appendInlineToggleBtn = () => this.appendToggleBtn(labelRightDiv, slot);
        const appendInlineEdit = () => {
            const valueEl = this.appendValueDiv(slotElement, ctx);
            if (slot.isEmpty())
                valueEl.hidden = true;
            this.appendEditBtn(labelRightDiv, ctx, valueEl);
        };
        if (mode !== 'normal') {
            labelDiv.classList.add('minimized');
            appendInlineToggleBtn();
            appendInlineEdit();
        }
        switch (mode) {
            case 'hidden-empty':
                break;
            case 'hidden-disabled':
                break;
            case 'disabled-empty':
                break;
            case 'normal':
                this.decorateSlot(ctx);
                break;
            default: assertNever(mode);
        }
        slotElement.appendChild(actionsEl);
        container.appendChild(slotElement);
    }
    getSlotRenderMode(slot, panel) {
        if (slot.isEmpty() && panel.areEmptySlotsHidden()) {
            return 'hidden-empty';
        }
        if (slot.isDisabled() && panel.areDisabledSlotsHidden()) {
            return 'hidden-disabled';
        }
        if (slot.isEmpty() && slot.isDisabled()) {
            return 'disabled-empty';
        }
        return 'normal';
    }
    decorateSlot(ctx) {
        const valueEl = this.appendValueDiv(ctx.slotElement, ctx);
        this.appendToggleBtn(ctx.actionsLeftEl, ctx.slot);
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'slot-button delete-slot';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => this.askDeleteSlot(ctx.slotElement, ctx.slot));
        ctx.actionsLeftEl.appendChild(deleteBtn);
        const shiftBtn = document.createElement('button');
        shiftBtn.className = 'slot-button slot-shift';
        shiftBtn.textContent = 'Shift';
        shiftBtn.addEventListener('click', () => {
            this.beginSlotShift(ctx.slotElement, ctx.displaySlot);
        });
        ctx.actionsLeftEl.appendChild(shiftBtn);
        const moveBtn = document.createElement('button');
        moveBtn.classList.add('slot-button', 'move-slot');
        moveBtn.textContent = 'Move';
        moveBtn.addEventListener('click', () => this.moveSlot(ctx.slot));
        ctx.actionsLeftEl.appendChild(moveBtn);
    }
    appendValueDiv(container, ctx) {
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
        });
        container.appendChild(valueEl);
        return valueEl;
    }
    renderInlineCode(value) {
        const frag = document.createDocumentFragment();
        const appendText = (start, end) => frag.append(document.createTextNode(value.slice(start, end)));
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
    createMacroSpan(macro) {
        // macro static content does not change until rerender
        const text = macro.full;
        const isOutlet = macro.content.startsWith('outlet::');
        const getPrompt = () => {
            const prompt = substituteParams(text);
            return prompt === text ? null : prompt;
        };
        const span = createElement('span', 'slot-macro-span', text);
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
    appendToggleBtn(container, slot) {
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'slot-button slot-toggle';
        const enabled = slot.isEnabled();
        toggleBtn.classList.add(enabled ? 'is-enabled' : 'is-disabled');
        toggleBtn.textContent = enabled ? 'Disable' : 'Enable';
        toggleBtn.addEventListener('click', () => {
            this.outfitView.toggleSlot(slot.id);
            this.outfitManager.updateOutfitValue(slot.id);
            this.panel.saveAndRender();
        });
        container.appendChild(toggleBtn);
        return toggleBtn;
    }
    appendEditBtn(container, ctx, valueEl) {
        const editBtn = appendElement(container, 'button', 'slot-button edit-slot', '✏️');
        editBtn.addEventListener('click', () => this.beginInlineEdit(ctx, valueEl));
        return editBtn;
    }
    removeActionButtons(slotElement) {
        const selectors = [
            '.slot-toggle',
            '.delete-slot',
            '.slot-shift',
            '.move-slot',
            'edit-slot'
        ];
        for (const selector of selectors) {
            slotElement.querySelector(selector)?.remove();
        }
    }
    toSlotId(slotName) {
        return slotName
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '') // drop punctation/symbols
            .replace(/\s+/g, '-') // space → hyphens
            .replace(/-+/g, '-'); // collapse repeat hyphens
    }
    /* ------------------------------- Slot Moving ------------------------------ */
    moveSlot(slot) {
        const kind = prompt('Move slot to kind:')?.trim();
        if (!kind)
            return;
        const result = this.outfitView.moveToKind(slot.id, kind);
        switch (result) {
            case "slot-not-found":
                throw new Error(`Could not find slot "${slot.id}" when moving to "${kind}"`);
            case "noop":
                return;
            case "moved":
                this.panel.saveAndRender();
                return;
            default: assertNever(result);
        }
    }
    /* ------------------------------ Slot Deletion ----------------------------- */
    askDeleteSlot(slotElement, slot) {
        const confirmed = window.confirm('Are you sure you want to delete this slot?');
        if (confirmed) {
            this.outfitManager.deleteOutfitSlot(slot.id);
        }
        this.panel.saveAndRender();
    }
    /* ------------------------------ Slot Shifting ----------------------------- */
    beginSlotShift(slotElement, display) {
        this.removeActionButtons(slotElement);
        const select = document.createElement('select');
        select.className = 'slot-shift-select';
        const options = [];
        const displaySlots = this.currentDisplaySlots;
        const placeholder = document.createElement('option');
        placeholder.textContent = 'Move slot...';
        placeholder.disabled = true;
        placeholder.selected = true;
        placeholder.value = '';
        select.appendChild(placeholder);
        for (const ds of displaySlots) {
            if (ds.slot.id === display.slot.id)
                continue; // skip self
            // Skip no-op: already before this slot
            if (ds.displayIndex === display.displayIndex + 1)
                continue;
            options.push({
                label: `Before: ${toSlotName(ds.slot.id)}`,
                targetDisplayIndex: ds.displayIndex
            });
        }
        options.push({
            label: 'End',
            targetDisplayIndex: null // sentinel
        });
        for (const opt of options) {
            const optionEl = document.createElement('option');
            optionEl.textContent = opt.label;
            optionEl.value = opt.targetDisplayIndex === null
                ? 'back'
                : String(opt.targetDisplayIndex);
            select.appendChild(optionEl);
        }
        slotElement.querySelector('.slot-actions').appendChild(select);
        select.focus();
        select.addEventListener('change', () => this.shiftSlot(select, display));
        select.addEventListener('blur', () => {
            this.panel.render();
        });
    }
    shiftSlot(select, display) {
        const displaySlots = this.currentDisplaySlots;
        const value = select.value;
        const sourceSlotIndex = display.slotIndex;
        let targetSlotIndex;
        if (value === 'back') {
            const last = displaySlots[displaySlots.length - 1];
            targetSlotIndex = last.slotIndex + 1;
        }
        else {
            const targetDisplayIndex = Number(value);
            const target = displaySlots.find(ds => ds.displayIndex === targetDisplayIndex);
            if (!target)
                return;
            targetSlotIndex = target.slotIndex;
        }
        if (sourceSlotIndex < targetSlotIndex) {
            targetSlotIndex--;
        }
        const result = this.outfitView
            .shiftSlotByIndex(sourceSlotIndex, targetSlotIndex);
        switch (result) {
            case 'slot-not-found':
                break;
            case 'index-out-of-bounds':
                break;
            case 'noop':
                break;
            case 'moved':
                break;
            default: assertNever(result);
        }
        this.panel.saveAndRender();
    }
    /* --------------------------- Slot Label Renaming -------------------------- */
    beginRename(slotNameEl, ctx) {
        const originalValue = slotNameEl.innerText.trim();
        const textarea = createElement('textarea', 'label-editbox');
        textarea.rows = 1;
        textarea.value = originalValue;
        const cancelBtn = createElement('button', 'slot-button cancel-button', 'Cancel');
        const saveBtn = createElement('button', 'slot-button save-button', 'Save');
        // Wiring
        const cancelRename = () => {
            this.panel.render();
        };
        cancelBtn.addEventListener('click', cancelRename);
        saveBtn.addEventListener('click', () => this.commitRename(ctx.slot, textarea));
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.commitRename(ctx.slot, textarea);
            }
            else if (e.key === 'Escape') {
                e.preventDefault();
                cancelRename();
            }
        });
        // Insertion
        ctx.labelRightDiv.replaceChildren(cancelBtn, saveBtn);
        slotNameEl.replaceWith(textarea);
        textarea.focus();
    }
    commitRename(slot, textarea) {
        const rawName = textarea.value;
        const newSlotId = this.toSlotId(rawName);
        const slotAlreadyExists = this.outfitView.hasSlotId(newSlotId);
        const hadToFormat = rawName !== newSlotId;
        if (hadToFormat) {
            textarea.value = newSlotId;
        }
        if (slotAlreadyExists) {
            this.panel.sendSystemMessage(`A slot named ${newSlotId} already exists.`);
            return; // make user change slot id
        }
        if (hadToFormat) {
            return; // make user re-confirm formatted slot id
        }
        const result = this.outfitManager.renameSlot(slot.id, newSlotId);
        switch (result) {
            case 'slot-not-found':
                this.panel.sendSystemMessage('That slot no longer exists. The list may have changed');
                break;
            case 'slot-already-exists':
                this.panel.sendSystemMessage(`A slot named ${newSlotId} already exists.`);
                break;
            case 'slot-renamed':
                this.panel.sendSystemMessage(`Successfully renamed slot from ${slot.id} to ${newSlotId}`);
                break;
            default: assertNever(result);
        }
        this.panel.saveAndRender();
    }
    /* --------------------------- Slot Value Editing --------------------------- */
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
            textarea.style.height = 'auto'; // reset
            textarea.style.height = `${textarea.scrollHeight}px`;
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
        textarea.addEventListener('input', autoResize);
        this.removeActionButtons(ctx.slotElement);
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
            const clearBtn = document.createElement('button');
            clearBtn.classList.add('slot-button', 'clear-button');
            clearBtn.textContent = 'Clear';
            clearBtn.addEventListener('click', async () => {
                await this.outfitManager.setOutfitItem(ctx.slot.id, 'None');
                cleanup();
                this.panel.render();
            });
            preventBlur(clearBtn);
            ctx.actionsLeftEl.appendChild(clearBtn);
        }
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
        this.panel.render();
    }
}
