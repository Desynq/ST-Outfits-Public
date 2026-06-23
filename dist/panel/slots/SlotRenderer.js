import { assertNever, toSlotName } from "../../shared.js";
import { SlotConditionsModal } from "../../ui/components/SlotConditionsModal.js";
import { SlotPresetsModal } from "../../ui/components/SlotPresetsModal.js";
import { addDoubleTapListener } from "../../util/element/click-actions.js";
import { mergeClassNames } from "../../util/element/css.js";
import { appendElement, createDiv, createElement, el } from "../../util/ElementHelper.js";
import { toSlotId } from "../../util/normalize/slot.js";
import { isSlotBlocked } from "../../util/slot.js";
import { OutfitPanelContext } from "../base/OutfitPanelContext.js";
import { SlotActionsMenuElement } from "./ActionOverflowElement.js";
import { SlotActionsElement } from "./SlotActionsElement.js";
import { SlotChatAddendumController, SlotValueController } from "./SlotValueController.js";
export class SlotRenderer extends OutfitPanelContext {
    constructor(deps) {
        super(deps.panel);
        this.deps = deps;
        this.valueElement = new SlotValueController({
            panel: this.panel,
            removeActionButtons: (ctx) => this.removeActionButtons(ctx),
            editCoordinator: this.deps.editCoordinator
        });
        this.noteElement = new SlotChatAddendumController({
            panel: this.panel,
            removeActionButtons: (ctx) => this.removeActionButtons(ctx),
            editCoordinator: this.deps.editCoordinator
        });
    }
    isValueHidden(mode) {
        return mode !== 'normal';
    }
    createSlotElement(container, display) {
        const slot = display.slot;
        const slotElement = el('div', {
            className: 'outfit-slot',
            dataset: { slot: display.slot.id },
            classes: [
                slot.enabled && !slot.equipped && '--unequipped',
                !slot.enabled && '--disabled',
                isSlotBlocked(slot.raw, this.outfitView.slots) && '--blocked'
            ]
        });
        const labelDiv = appendElement(slotElement, 'div', 'slot-label');
        const labelLeftDiv = appendElement(labelDiv, 'div', 'slot-label-left');
        const labelRightDiv = appendElement(labelDiv, 'div', 'slot-label-right');
        const titleRow = appendElement(labelLeftDiv, 'div', 'slot-label-row');
        const ordinalEl = appendElement(titleRow, 'div', 'slot-ordinal', display.displayIndex.toString());
        const name = toSlotName(slot.id);
        const slotNameEl = appendElement(titleRow, 'div', 'slot-name', name);
        slotNameEl.dataset.text = name;
        const contentEl = createDiv('slot-content');
        const contentTextEl = createDiv('slot-content-text');
        const imageActionsEl = createDiv('slot-image-actions');
        const actionsEl = document.createElement('div');
        actionsEl.className = 'slot-actions';
        const actionsLeftEl = appendElement(actionsEl, 'div', 'slot-actions-left');
        const actionsRightEl = appendElement(actionsEl, 'div', 'slot-actions-right');
        const mode = this.getSlotRenderMode(slot, this.panel);
        const ctx = {
            slot,
            displaySlot: display,
            mode,
            scroller: container,
            slotElement,
            labelDiv,
            labelLeftDiv,
            slotNameEl,
            labelRightDiv,
            contentEl,
            contentTextEl,
            imageActionsEl,
            actionsLeftEl,
            actionsRightEl,
        };
        const armTap = (delay) => {
            slotNameEl.dataset.delay = delay.toString();
            slotNameEl.style.setProperty("--tap-delay", `${slotNameEl.dataset.delay}ms`);
            slotNameEl.classList.add('tap-armed');
        };
        const disarmTap = () => slotNameEl.classList.remove('tap-armed');
        addDoubleTapListener(slotNameEl, () => { disarmTap(); this.beginRename(slotNameEl, ctx); }, 300, () => { disarmTap(); this.toggle(ctx.slot); }, armTap);
        const imageElement = this.renderImageElement(ctx);
        contentEl.append(contentTextEl);
        const { valueEl } = this.valueElement.render(contentTextEl, ctx);
        if (mode !== 'normal' && this.valueElement.isEmpty(slot)) {
            valueEl.hidden = true;
        }
        const { valueEl: addendumEl } = this.noteElement.render(contentTextEl, ctx);
        if (mode !== 'normal' && this.noteElement.isEmpty(slot)) {
            addendumEl.hidden = true;
        }
        switch (mode) {
            case 'hidden-empty':
            case 'hidden-disabled':
            case 'disabled-empty':
                this.decorateMinimal(ctx, valueEl, addendumEl);
                break;
            case 'normal':
                this.decorate(ctx, valueEl, addendumEl, imageElement);
                break;
            default: assertNever(mode);
        }
        slotElement.append(contentEl, imageActionsEl, actionsEl);
        return slotElement;
    }
    renderImageElement(ctx) {
        const imageElement = this.deps.imageFactory.build(ctx.slot);
        const { imgWrapper } = imageElement;
        const parent = this.resolveImageParent(imageElement.state, ctx);
        if (parent === 'none')
            return imageElement;
        const target = {
            'label-right': ctx.labelRightDiv,
            'content': ctx.contentEl
        }[parent];
        imageElement.appendTo(target);
        if (imageElement.state === 'shown') {
            this.bindShownImageElement(ctx, imageElement, imgWrapper);
        }
        return imageElement;
    }
    bindShownImageElement(ctx, imageElement, imgWrapper) {
        const menu = this.createImageMenu(ctx, imageElement, imgWrapper);
        imageElement.onDoubleTap(() => menu.toggleMenu());
        const observer = imageElement.trackResizeChanges(ctx.contentEl);
        this.panel.onRenderDispose(observer.disconnect);
        let noteEl = null;
        let valueEl = null;
        observer.onResize(event => {
            if (!valueEl)
                return;
            if (event.imageWide) {
                this.valueElement.setCollapsedMaxHeight(valueEl, null);
                return;
            }
            const noteHeight = noteEl?.getBoundingClientRect().height ?? 0;
            const height = Math.max(0, event.imageRect.height - noteHeight);
            this.valueElement.setCollapsedMaxHeight(valueEl, height);
        });
        const updateOnRender = (controller, set) => {
            controller.onRender(event => {
                if (!event.isFor(ctx))
                    return;
                set(event.valueEl);
                observer.update();
            });
        };
        updateOnRender(this.noteElement, el => noteEl = el);
        updateOnRender(this.valueElement, el => valueEl = el);
    }
    createImageMenu(ctx, imageElement, opener) {
        return this.deps.overflowMenuFactory.create({
            openerEl: opener,
            onDispose: this.panel.onRenderDispose,
            align: 'left',
            options: {
                parent: ctx.slotElement,
                className: 'slot-overflow-menu',
            },
            getViewBoundary: () => ctx.scroller.getBoundingClientRect()
        })
            .onBuild(menu => {
            menu.append(el('button', {
                className: 'slot-button change-image-button',
                text: 'Change Image',
                events: {
                    click: () => imageElement.changeImage()
                }
            }));
            imageElement.appendControlsTo?.(menu);
        })
            .onClopen(open => ctx.slotElement.classList.toggle('--menu-open', open));
    }
    resolveImageParent(state, ctx) {
        if (this.isValueHidden(ctx.mode))
            return 'none';
        if (state === 'shown') {
            return 'content';
        }
        return 'label-right';
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
    decorateMinimal(ctx, valueEl, addendumEl) {
        const toggleBtn = this.createToggleBtn(ctx.slot);
        ctx.labelRightDiv.append(toggleBtn);
        this.appendEditBtn(ctx.labelRightDiv, ctx, valueEl);
        if (valueEl.hidden) {
            ctx.labelDiv.classList.add('minimized');
            addendumEl.hidden = true;
        }
        this.createMenuBtn(ctx, addendumEl).appendTo(ctx.labelRightDiv);
    }
    decorate(ctx, valueEl, addendumEl, imageElement) {
        const actionsElement = new SlotActionsElement(this.panel);
        const toggleBtn = this.createToggleBtn(ctx.slot);
        ctx.actionsLeftEl.append(toggleBtn);
        if (ctx.slot.enabled) {
            const unequipBtn = actionsElement.createUnequipButton(ctx.slot);
            ctx.actionsLeftEl.append(unequipBtn);
        }
        if (this.noteElement.isEmpty(ctx.slot)) {
            addendumEl.hidden = true;
        }
        this.appendEditBtn(ctx.actionsRightEl, ctx, valueEl);
        this.createMenuBtn(ctx, addendumEl).appendTo(ctx.actionsRightEl);
        if (imageElement.state === 'shown') {
            const syncBtn = this.createSyncButton(ctx);
            ctx.labelRightDiv.append(syncBtn);
        }
    }
    createMenuBtn(ctx, addendumEl) {
        return new SlotActionsMenuElement({
            mountEl: ctx.slotElement,
            getViewBoundary: () => ctx.scroller.getBoundingClientRect(),
            onDispose: this.panel.onRenderDispose,
            deleteSlot: () => this.askDeleteSlot(ctx.slotElement, ctx.slot),
            shiftSlot: () => this.beginSlotShift(ctx),
            moveSlot: () => this.moveSlot(ctx.slot),
            showPresets: () => SlotPresetsModal.show(ctx.slot, this.outfitManager, () => this.outfitManager.updateContext(), () => this.panel.saveAndRender()),
            canAddNote: () => this.getSlotRenderMode(ctx.slot, this.panel) === 'normal' && this.noteElement.isEmpty(ctx.slot),
            addNote: () => this.noteElement.beginInlineEdit(ctx, addendumEl),
            showConditions: () => SlotConditionsModal.show(ctx.slot, this.outfitManager, () => this.outfitManager.updateContext(), () => this.panel.saveAndRender())
        }, this.deps.overflowMenuFactory)
            .onClopen(open => ctx.slotElement.classList.toggle('--menu-open', open));
    }
    createToggleBtn(slot) {
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'slot-button slot-toggle';
        const enabled = slot.isEnabled();
        toggleBtn.classList.add(enabled ? 'is-enabled' : 'is-disabled');
        toggleBtn.textContent = enabled ? 'Disable' : 'Enable';
        toggleBtn.addEventListener('click', () => this.toggle(slot));
        return toggleBtn;
    }
    toggle(slot) {
        this.outfitView.toggleSlot(slot.id);
        void this.outfitManager.updateSlotContext(slot.id);
        this.panel.saveAndRender();
    }
    appendEditBtn(container, ctx, valueEl) {
        const editBtn = appendElement(container, 'button', 'slot-button edit-slot', '✏️');
        editBtn.addEventListener('click', () => this.valueElement.beginInlineEdit(ctx, valueEl));
        return editBtn;
    }
    createSyncButton(ctx) {
        return el('button', {
            className: mergeClassNames('sync-slot-button', ctx.slot.synced ? 'active' : 'inactive'),
            text: '⇆',
            events: {
                click: async () => {
                    await this.outfitManager.setSlotSync(ctx.slot.id, !ctx.slot.synced);
                    this.panel.saveAndRender();
                }
            }
        });
    }
    removeActionButtons(ctx) {
        const selectors = [
            '.slot-toggle',
            '.delete-slot',
            '.slot-shift',
            '.move-slot',
            '.edit-slot',
            '.slot-presets-button',
            '.unequip-button',
            '.slot-overflow-button'
        ];
        for (const selector of selectors) {
            ctx.slotElement.querySelector(selector)?.remove();
        }
        ctx.imageActionsEl.replaceChildren();
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
    beginSlotShift(ctx) {
        const { displayIndex, slot } = ctx.displaySlot;
        this.removeActionButtons(ctx);
        const select = document.createElement('select');
        select.className = 'slot-shift-select';
        const options = [];
        const displaySlots = this.deps.displaySlots;
        const placeholder = document.createElement('option');
        placeholder.textContent = 'Move slot...';
        placeholder.disabled = true;
        placeholder.selected = true;
        placeholder.value = '';
        select.appendChild(placeholder);
        for (const ds of displaySlots) {
            if (ds.slot.id === slot.id)
                continue; // skip self
            // Skip no-op: already before this slot
            if (ds.displayIndex === displayIndex + 1)
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
        ctx.slotElement.querySelector('.slot-actions').appendChild(select);
        select.focus();
        select.addEventListener('change', () => this.shiftSlot(select, ctx.displaySlot));
        select.addEventListener('blur', () => {
            this.panel.renderTabsAndActiveContent();
        });
    }
    shiftSlot(select, display) {
        const displaySlots = this.deps.displaySlots;
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
            this.panel.renderTabsAndActiveContent();
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
        const newSlotId = toSlotId(rawName);
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
