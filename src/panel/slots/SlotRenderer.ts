import { OutfitSlot } from "../../data/model/Outfit.js";
import { OutfitSlotState } from "../../data/model/OutfitSnapshots.js";
import { assertNever, toSlotName } from "../../shared.js";
import { PanelType } from "../../types/maps.js";
import { SlotPresetsModal } from "../../ui/components/SlotPresetsModal.js";
import { addDoubleTapListener } from "../../util/element/click-actions.js";
import { appendElement, createDiv, el, createElement, createWithClasses, addOrRemoveClass } from "../../util/ElementHelper.js";
import { OutfitPanelContext } from "../base/OutfitPanelContext.js";
import { Disposer } from "../Disposer.js";
import { OutfitPanel } from "../OutfitPanel.js";
import { OutfitSlotsHost } from "../OutfitSlotsHost.js";
import { DisplaySlot } from "./DisplaySlot.js";
import { SlotActionsElement } from "./SlotActionsElement.js";
import { ImageState, SlotImageElement, SlotImageElementFactory } from "./SlotImageController.js";
import { SlotValueController } from "./SlotValueController.js";

export interface SlotContext {
	slot: OutfitSlotState;
	displaySlot: DisplaySlot;
	mode: SlotRenderMode;

	scroller: HTMLElement;
	slotElement: HTMLDivElement;

	labelLeftDiv: HTMLDivElement;
	slotNameEl: HTMLDivElement;
	labelRightDiv: HTMLDivElement;

	contentEl: HTMLDivElement;

	imageActionsEl: HTMLDivElement;

	actionsLeftEl: HTMLDivElement;
	actionsRightEl: HTMLDivElement;
}

type SlotRenderMode = 'hidden-empty' | 'hidden-disabled' | 'disabled-empty' | 'normal';
type ImageParent = 'content' | 'label-right' | 'none';

export class SlotRenderer extends OutfitPanelContext {

	private readonly slotValControl: SlotValueController;

	public constructor(
		panel: OutfitPanel<PanelType>,
		private readonly displaySlots: DisplaySlot[],
		private readonly imageElementFactory: SlotImageElementFactory
	) {
		super(panel);
		this.slotValControl = new SlotValueController(
			this.panel,
			(ctx: SlotContext) => this.removeActionButtons(ctx)
		);
	}

	private isValueHidden(mode: SlotRenderMode): boolean {
		return mode !== 'normal';
	}

	public createSlotElement(
		container: HTMLDivElement,
		display: DisplaySlot
	): HTMLDivElement {
		const slot = display.slot;

		const slotElement = el('div', {
			className: 'outfit-slot',
			dataset: { slot: display.slot.id },
			classes: [
				slot.enabled && !slot.equipped && '--unequipped',
				!slot.enabled && '--disabled',
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

		const imageActionsEl = createDiv('slot-image-actions');

		const actionsEl = document.createElement('div');
		actionsEl.className = 'slot-actions';

		const actionsLeftEl = appendElement(actionsEl, 'div', 'slot-actions-left');
		const actionsRightEl = appendElement(actionsEl, 'div', 'slot-actions-right');

		const mode = this.getSlotRenderMode(slot, this.panel);

		const ctx: SlotContext = {
			slot,
			displaySlot: display,
			mode,

			scroller: container,
			slotElement,
			labelLeftDiv,
			slotNameEl,
			labelRightDiv,
			contentEl,
			imageActionsEl,
			actionsLeftEl,
			actionsRightEl,
		};

		const armTap = (delay: number) => {
			slotNameEl.dataset.delay = delay.toString();
			slotNameEl.style.setProperty("--tap-delay", `${slotNameEl.dataset.delay}ms`);
			slotNameEl.classList.add('tap-armed');
		};
		const disarmTap = () => slotNameEl.classList.remove('tap-armed');

		addDoubleTapListener(
			slotNameEl,
			() => { disarmTap(); this.beginRename(slotNameEl, ctx); },
			300,
			() => { disarmTap(); this.toggle(ctx.slot); },
			armTap
		);

		const imageElement = this.renderImageElement(ctx);


		const appendInlineToggleBtn = () => {
			const toggleBtn = this.createToggleBtn(slot);
			labelRightDiv.append(toggleBtn);
		};

		const appendInlineEdit = () => {
			const valueEl = this.slotValControl.render(contentEl, ctx);
			if (slot.isEmpty()) valueEl.hidden = true;
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
				this.decorateSlot(ctx, imageElement);
				break;
			default: assertNever(mode);
		}


		slotElement.append(
			contentEl,
			imageActionsEl,
			actionsEl
		);
		return slotElement;
	}

	private renderImageElement(ctx: SlotContext): SlotImageElement {
		const imageElement = this.imageElementFactory.build(ctx.slot);

		const parent = this.resolveImageParent(imageElement.state, ctx);
		switch (parent) {
			case 'none':
				break;
			case 'label-right':
				imageElement.appendControlsTo?.(ctx.imageActionsEl);
				imageElement.appendTo(ctx.labelRightDiv);
				break;
			case 'content':
				imageElement.appendControlsTo?.(ctx.imageActionsEl);
				imageElement.appendTo(ctx.contentEl);
				break;
			default: assertNever(parent);
		}

		return imageElement;
	}

	private resolveImageParent(state: ImageState, ctx: SlotContext): ImageParent {
		if (this.isValueHidden(ctx.mode)) return 'none';

		if (state === 'shown') {
			return 'content';
		}

		return 'label-right';
	}

	private getSlotRenderMode(slot: OutfitSlotState, panel: OutfitSlotsHost): SlotRenderMode {
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

	private decorateSlot(
		ctx: SlotContext,
		imageElement: SlotImageElement
	): void {
		const actionsElement = new SlotActionsElement(this.panel);

		const valueEl = this.slotValControl.render(ctx.contentEl, ctx);
		imageElement.observe(ctx.contentEl, valueEl, this.panel.disposer);

		const toggleBtn = this.createToggleBtn(ctx.slot);
		ctx.actionsLeftEl.append(toggleBtn);

		if (ctx.slot.enabled) {
			const unequipBtn = actionsElement.createUnequipButton(ctx.slot);
			ctx.actionsLeftEl.append(unequipBtn);
		}


		const deleteBtn = document.createElement('button');
		deleteBtn.className = 'slot-button delete-slot';
		deleteBtn.textContent = 'Delete';
		deleteBtn.addEventListener('click', () => this.askDeleteSlot(ctx.slotElement, ctx.slot));
		ctx.actionsLeftEl.appendChild(deleteBtn);


		const shiftBtn = document.createElement('button');
		shiftBtn.className = 'slot-button slot-shift';
		shiftBtn.textContent = 'Shift';
		shiftBtn.addEventListener('click', () => {
			this.beginSlotShift(ctx);
		});
		ctx.actionsLeftEl.appendChild(shiftBtn);


		const moveBtn = document.createElement('button');
		moveBtn.classList.add('slot-button', 'move-slot');
		moveBtn.textContent = 'Move';
		moveBtn.addEventListener(
			'click',
			() => this.moveSlot(ctx.slot)
		);
		ctx.actionsLeftEl.appendChild(moveBtn);

		const presetsBtn = createElement('button', 'slot-button slot-presets-button', 'Presets');
		presetsBtn.addEventListener(
			'click',
			() => SlotPresetsModal.show(
				ctx.slot,
				this.outfitManager,
				() => this.panel.saveAndRender()
			)
		);
		ctx.actionsRightEl.append(presetsBtn);

		// const editBtn = this.appendEditBtn(ctx.actionsRightEl, ctx, valueEl);
	}

	private createToggleBtn(slot: OutfitSlotState): HTMLButtonElement {
		const toggleBtn = document.createElement('button');
		toggleBtn.className = 'slot-button slot-toggle';

		const enabled = slot.isEnabled();
		toggleBtn.classList.add(enabled ? 'is-enabled' : 'is-disabled');
		toggleBtn.textContent = enabled ? 'Disable' : 'Enable';

		toggleBtn.addEventListener('click', () => this.toggle(slot));

		return toggleBtn;
	}

	private toggle(slot: OutfitSlotState): void {
		this.outfitView.toggleSlot(slot.id);
		this.outfitManager.updateOutfitValue(slot.id);
		this.panel.saveAndRender();
	}




	private appendEditBtn(container: HTMLDivElement, ctx: SlotContext, valueEl: HTMLDivElement): HTMLButtonElement {
		const editBtn = appendElement(container, 'button', 'slot-button edit-slot', '✏️');

		editBtn.addEventListener(
			'click',
			() => this.slotValControl.beginInlineEdit(ctx, valueEl)
		);
		return editBtn;
	}

	private removeActionButtons(ctx: SlotContext): void {
		const selectors = [
			'.slot-toggle',
			'.delete-slot',
			'.slot-shift',
			'.move-slot',
			'.edit-slot',
			'.slot-presets-button',
			'.unequip-button'
		];

		for (const selector of selectors) {
			ctx.slotElement.querySelector<HTMLButtonElement>(selector)?.remove();
		}

		ctx.imageActionsEl.replaceChildren();
	}

	private toSlotId(slotName: string): string {
		return slotName
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9\s-]/g, '') // drop punctation/symbols
			.replace(/\s+/g, '-') // space → hyphens
			.replace(/-+/g, '-'); // collapse repeat hyphens
	}

	/* ------------------------------- Slot Moving ------------------------------ */

	private moveSlot(slot: OutfitSlotState): void {
		const kind = prompt('Move slot to kind:')?.trim();
		if (!kind) return;

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

	private askDeleteSlot(slotElement: HTMLDivElement, slot: OutfitSlotState): void {
		const confirmed = window.confirm('Are you sure you want to delete this slot?');

		if (confirmed) {
			this.outfitManager.deleteOutfitSlot(slot.id);
		}

		this.panel.saveAndRender();
	}

	/* ------------------------------ Slot Shifting ----------------------------- */

	private beginSlotShift(ctx: SlotContext): void {
		const { displayIndex, slot } = ctx.displaySlot;
		this.removeActionButtons(ctx);

		const select = document.createElement('select');
		select.className = 'slot-shift-select';

		const options: { label: string; targetDisplayIndex: number | null; }[] = [];
		const displaySlots = this.displaySlots;

		const placeholder = document.createElement('option');
		placeholder.textContent = 'Move slot...';
		placeholder.disabled = true;
		placeholder.selected = true;
		placeholder.value = '';
		select.appendChild(placeholder);

		for (const ds of displaySlots) {
			if (ds.slot.id === slot.id) continue; // skip self

			// Skip no-op: already before this slot
			if (ds.displayIndex === displayIndex + 1) continue;

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

		ctx.slotElement.querySelector('.slot-actions')!.appendChild(select);
		select.focus();

		select.addEventListener('change', () => this.shiftSlot(select, ctx.displaySlot));

		select.addEventListener('blur', () => {
			this.panel.render();
		});
	}

	private shiftSlot(select: HTMLSelectElement, display: DisplaySlot): void {
		const displaySlots = this.displaySlots;
		const value = select.value;

		const sourceSlotIndex = display.slotIndex;
		let targetSlotIndex: number;

		if (value === 'back') {
			const last = displaySlots[displaySlots.length - 1];
			targetSlotIndex = last.slotIndex + 1;
		}
		else {
			const targetDisplayIndex = Number(value);
			const target = displaySlots.find(
				ds => ds.displayIndex === targetDisplayIndex
			);

			if (!target) return;

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

	private beginRename(slotNameEl: HTMLDivElement, ctx: SlotContext): void {
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
		ctx.labelRightDiv.replaceChildren(
			cancelBtn,
			saveBtn
		);

		slotNameEl.replaceWith(textarea);
		textarea.focus();
	}

	private commitRename(slot: OutfitSlotState, textarea: HTMLTextAreaElement): void {
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