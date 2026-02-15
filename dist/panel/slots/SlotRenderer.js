import { assertNever, toSlotName } from "../../shared.js";
import { addDoubleTapListener } from "../../util/element/click-actions.js";
import { appendElement, createElement } from "../../util/ElementHelper.js";
import { OutfitPanelContext } from "../base/OutfitPanelContext.js";
import { SlotImageController } from "./SlotImageController.js";
import { SlotValueController } from "./SlotValueController.js";
export class SlotRenderer extends OutfitPanelContext {
    constructor(panel, getDisplaySlots) {
        super(panel);
        this.getDisplaySlots = getDisplaySlots;
        this.slotValControl = new SlotValueController(this.panel, this.removeActionButtons.bind(this));
        this.slotImageControl = new SlotImageController(this.panel);
    }
    isValueHidden(mode) {
        return mode !== 'normal';
    }
    render(container, display) {
        const slot = display.slot;
        const slotElement = document.createElement('div');
        slotElement.className = 'outfit-slot';
        slotElement.dataset.slot = display.slot.id;
        const labelDiv = appendElement(slotElement, 'div', 'slot-label');
        const labelLeftDiv = appendElement(labelDiv, 'div', 'slot-label-left');
        const labelRightDiv = appendElement(labelDiv, 'div', 'slot-label-right');
        const titleRow = appendElement(labelLeftDiv, 'div', 'slot-label-row');
        appendElement(titleRow, 'div', 'slot-ordinal', display.displayIndex.toString());
        const name = toSlotName(slot.id);
        const slotNameEl = appendElement(titleRow, 'div', 'slot-name', name);
        slotNameEl.dataset.text = name;
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
        const armTap = (delay) => {
            slotNameEl.dataset.delay = delay.toString();
            slotNameEl.style.setProperty("--tap-delay", `${slotNameEl.dataset.delay}ms`);
            slotNameEl.classList.add('tap-armed');
        };
        const disarmTap = () => slotNameEl.classList.remove('tap-armed');
        addDoubleTapListener(slotNameEl, () => { disarmTap(); this.beginRename(slotNameEl, ctx); }, 300, () => { disarmTap(); this.toggle(ctx.slot); }, armTap);
        if (!this.isValueHidden(mode)) {
            const { imgWrapper } = this.slotImageControl.create(ctx);
            ctx.labelRightDiv.append(imgWrapper);
        }
        const appendInlineToggleBtn = () => this.appendToggleBtn(labelRightDiv, slot);
        const appendInlineEdit = () => {
            const valueEl = this.slotValControl.render(slotElement, ctx);
            if (slot.isEmpty())
                valueEl.hidden = true;
            const editBtn = this.appendEditBtn(labelRightDiv, ctx, valueEl);
            return {
                valueEl,
                editBtn
            };
        };
        if (mode !== 'normal') {
            appendInlineToggleBtn();
            const { valueEl } = appendInlineEdit();
            if (valueEl.hidden) {
                labelDiv.classList.add('minimized');
            }
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
        const valueEl = this.slotValControl.render(ctx.slotElement, ctx);
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
    appendToggleBtn(container, slot) {
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'slot-button slot-toggle';
        const enabled = slot.isEnabled();
        toggleBtn.classList.add(enabled ? 'is-enabled' : 'is-disabled');
        toggleBtn.textContent = enabled ? 'Disable' : 'Enable';
        toggleBtn.addEventListener('click', () => this.toggle(slot));
        container.appendChild(toggleBtn);
        return toggleBtn;
    }
    toggle(slot) {
        this.outfitView.toggleSlot(slot.id);
        this.outfitManager.updateOutfitValue(slot.id);
        this.panel.saveAndRender();
    }
    appendEditBtn(container, ctx, valueEl) {
        const editBtn = appendElement(container, 'button', 'slot-button edit-slot', '✏️');
        editBtn.addEventListener('click', () => this.slotValControl.beginInlineEdit(ctx, valueEl));
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
        const displaySlots = this.getDisplaySlots();
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
        const displaySlots = this.getDisplaySlots();
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
}
