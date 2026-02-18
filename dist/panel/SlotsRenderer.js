import { assertNever, isMobile, toSlotName } from "../shared.js";
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
            if (slot.isDisabled() && this.panel.areDisabledSlotsHidden())
                continue;
            if (slot.isEmpty() && this.panel.areEmptySlotsHidden())
                continue;
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
            this.panel.renderContent();
            return;
        }
        const duplicate = !this.outfitView.addSlot(id, kind);
        if (duplicate) {
            this.panel.sendSystemMessage(`Slot with id ${id} already exists.`);
            return;
        }
        this.outfitManager.updateOutfitValue(id);
        this.panel.renderContent();
    }
    renderSlot(container, display) {
        const slotElement = document.createElement('div');
        slotElement.className = 'outfit-slot';
        slotElement.dataset.slot = display.slot.id;
        const disabledClass = display.slot.isDisabled() ? 'disabled' : '';
        const noneClass = display.slot.isEmpty() ? 'none' : '';
        /*html*/
        slotElement.innerHTML = `
			<div class="slot-label">
				<div class="slot-ordinal">${display.displayIndex}</div>
				<div class="slot-name">${toSlotName(display.slot.id)}</div>
			</div>
			<div class="slot-value ${disabledClass} ${noneClass}" title="${display.slot.value}">${display.slot.value}</div>
			<div class="slot-actions">
				<button class="slot-button slot-toggle">${display.slot.isDisabled() ? 'Enable' : 'Disable'}</button>
				<button class="slot-button delete-slot">Delete</button>
				<button class="slot-button slot-shift">Shift</button>
				<button class="slot-button slot-change">✏️</button>
			</div>
		`;
        slotElement.querySelector('.slot-toggle').addEventListener('click', () => {
            this.outfitView.toggleSlot(display.slot.id);
            this.outfitManager.updateOutfitValue(display.slot.id);
            this.panel.renderContent();
        });
        slotElement.querySelector('.slot-shift').addEventListener('click', () => {
            this.beginSlotShift(slotElement, display);
        });
        this.addDoubleTapEventListener(slotElement.querySelector('.slot-name'), () => this.beginRename(slotElement, display.slot));
        this.addDoubleTapEventListener(slotElement.querySelector('.slot-value'), () => this.beginInlineEdit(slotElement, display.slot));
        slotElement.querySelector('.slot-change').addEventListener('click', () => {
            this.beginInlineEdit(slotElement, display.slot);
        });
        slotElement.querySelector('.delete-slot')
            .addEventListener('click', () => this.askDeleteSlot(slotElement, display.slot));
        container.appendChild(slotElement);
    }
    removeActionButtons(slotElement) {
        const selectors = ['.slot-toggle', '.delete-slot', '.slot-shift', '.slot-change'];
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
    addDoubleTapEventListener(element, listener) {
        const DOUBLE_TAP_MS = 300;
        let lastTapTime = 0;
        element.addEventListener('click', (e) => {
            const now = performance.now();
            const delta = now - lastTapTime;
            if (delta > 0 && delta < DOUBLE_TAP_MS) {
                navigator.vibrate?.(20);
                listener();
                lastTapTime = 0; // reset so triple-tap doesn't retrigger
                return;
            }
            lastTapTime = now;
        });
    }
    /* ------------------------------ Slot Deletion ----------------------------- */
    askDeleteSlot(slotElement, slot) {
        const confirmed = window.confirm('Are you sure you want to delete this slot?');
        if (confirmed) {
            this.outfitManager.deleteOutfitSlot(slot.id);
        }
        this.panel.renderContent();
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
            this.panel.renderContent();
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
        this.panel.renderContent();
    }
    /* --------------------------- Slot Label Renaming -------------------------- */
    beginRename(slotElement, slot) {
        const labelEl = slotElement.querySelector('.slot-name');
        const originalValue = labelEl.innerText.trim();
        const textarea = document.createElement('textarea');
        textarea.className = 'label-editbox';
        textarea.rows = 1;
        textarea.value = originalValue;
        labelEl.replaceWith(textarea);
        textarea.focus();
        this.removeActionButtons(slotElement);
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.commitRename(slot, textarea);
            }
            else if (e.key === 'Escape') {
                e.preventDefault();
                this.cancelRename();
            }
        });
        textarea.addEventListener('blur', () => {
            this.cancelRename();
        });
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
        this.panel.renderContent();
    }
    cancelRename() {
        this.panel.renderContent();
    }
    /* --------------------------- Slot Value Editing --------------------------- */
    beginInlineEdit(slotElement, slot) {
        const valueEl = slotElement.querySelector('.slot-value');
        const actionsEl = slotElement.querySelector('.slot-actions');
        const originalValue = valueEl.innerText.trim();
        // Create editable textarea
        const textarea = document.createElement('textarea');
        textarea.className = 'slot-editbox';
        textarea.rows = 1;
        textarea.value = originalValue === 'None' || originalValue === 'Disabled' ? '' : originalValue;
        // Swap value box with editor
        valueEl.replaceWith(textarea);
        textarea.focus();
        const autoResize = () => {
            textarea.style.height = 'auto'; // reset
            textarea.style.height = `${textarea.scrollHeight}px`;
        };
        autoResize();
        textarea.addEventListener('input', autoResize);
        this.removeActionButtons(slotElement);
        textarea.addEventListener('keydown', (e) => {
            if (e.isComposing)
                return;
            if (!isMobile() && e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.commitValueEdit(textarea, slot);
            }
            else if (e.key === 'Escape') {
                e.preventDefault();
                this.cancelValueEdit();
            }
        });
        if (originalValue !== 'None') {
            const clearBtn = document.createElement('button');
            clearBtn.classList.add('slot-button', 'clear-button');
            clearBtn.textContent = 'Clear';
            actionsEl.appendChild(clearBtn);
            clearBtn.addEventListener('click', async () => {
                await this.outfitManager.setOutfitItem(slot.id, 'None');
                this.panel.renderContent();
            });
        }
        const cancelBtn = document.createElement('button');
        cancelBtn.classList.add('slot-button', 'cancel-button');
        cancelBtn.textContent = 'Cancel';
        actionsEl.appendChild(cancelBtn);
        cancelBtn.addEventListener('click', () => this.cancelValueEdit());
        const saveBtn = document.createElement('button');
        saveBtn.classList.add('slot-button', 'save-button');
        saveBtn.textContent = 'Save';
        actionsEl.appendChild(saveBtn);
        saveBtn.addEventListener('click', async () => this.commitValueEdit(textarea, slot));
    }
    async commitValueEdit(textarea, slot) {
        const newValue = textarea.value.trim() === ''
            ? 'None'
            : textarea.value.trim();
        await this.outfitManager.setOutfitItem(slot.id, newValue);
        this.panel.renderContent();
    }
    cancelValueEdit() {
        this.panel.renderContent();
    }
}
