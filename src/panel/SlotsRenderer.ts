import { OutfitManager } from "../manager/OutfitManager.js";
import { OutfitSlot, SlotKind } from "../outfit/model/Outfit.js";
import { ResolvedOutfitSlot } from "../outfit/model/OutfitSnapshots.js";
import { MutableOutfitView } from "../outfit/view/MutableOutfitView.js";
import { assertNever, isMobile, toSlotName } from "../shared.js";
import { appendElement } from "../util/ElementHelper.js";
import { OutfitSlotsHost } from "./OutfitSlotsHost.js";

interface SlotContext {
	scroller: HTMLElement;
	slotElement: HTMLDivElement;
	displaySlot: DisplaySlot;
	slot: ResolvedOutfitSlot;
	actionsLeftEl: HTMLDivElement;
	actionsRightEl: HTMLDivElement;
}

class DisplaySlot {
	public constructor(
		public readonly displayIndex: number,
		public readonly slotIndex: number,
		public readonly slot: ResolvedOutfitSlot
	) { }
}

export class SlotsRenderer {

	private currentDisplaySlots: DisplaySlot[] = [];

	public constructor(
		private panel: OutfitSlotsHost
	) { }

	private get outfitManager(): OutfitManager {
		return this.panel.getOutfitManager();
	}

	private get outfitView(): MutableOutfitView {
		return this.outfitManager.getOutfitView();
	}

	public renderSlots(kind: SlotKind, slots: readonly string[], container: HTMLDivElement): void {
		const resolvedSlots = this.outfitView.resolve(slots);
		const displaySlots: DisplaySlot[] = [];

		let displayIndex = 1;
		for (const slot of resolvedSlots) {
			if (!slot.resolved) {
				console.warn(`Slot ${slot.id} failed to resolve`);
				continue;
			}

			const slotIndex = this.outfitView.getIndexById(slot.id)!;

			const displaySlot = new DisplaySlot(displayIndex, slotIndex, slot);
			displaySlots.push(displaySlot);

			this.renderSlot(container, displaySlot);
			displayIndex++;
		}

		this.currentDisplaySlots = displaySlots;
		this.renderAddSlotButton(container, kind);
	}

	private renderAddSlotButton(container: HTMLDivElement, kind: SlotKind): void {
		const addSlotButton = document.createElement('button');
		addSlotButton.className = 'add-slot-button';
		addSlotButton.textContent = 'Add Slot';

		addSlotButton.addEventListener('click', () => this.addSlot(container, kind));
		container.appendChild(addSlotButton);
	}

	private addSlot(container: HTMLDivElement, kind: SlotKind): void {
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
		this.panel.saveAndRenderContent();
	}

	private renderSlot(
		container: HTMLDivElement,
		display: DisplaySlot
	): void {
		const slotElement = document.createElement('div');
		slotElement.className = 'outfit-slot';
		slotElement.dataset.slot = display.slot.id;

		const slot = display.slot;
		const disabledClass = slot.isDisabled() ? 'disabled' : '';
		const noneClass = slot.isEmpty() ? 'none' : '';

		/*html*/
		slotElement.innerHTML = `
			<div class="slot-label">
				<div class="slot-ordinal">${display.displayIndex}</div>
				<div class="slot-name">${toSlotName(slot.id)}</div>
			</div>
		`;

		const actionsEl = document.createElement('div');
		actionsEl.className = 'slot-actions';

		const actionsLeftEl = appendElement(actionsEl, 'div', 'slot-actions-left');
		const actionsRightEl = appendElement(actionsEl, 'div', 'slot-actions-right');

		if (!this.isSlotMinimized(slot)) {
			const ctx: SlotContext = {
				scroller: container,
				displaySlot: display,
				slotElement,
				slot: display.slot,
				actionsLeftEl,
				actionsRightEl
			};
			this.decorateSlot(ctx);
		}

		slotElement.appendChild(actionsEl);

		container.appendChild(slotElement);
	}

	private isSlotMinimized(slot: ResolvedOutfitSlot): boolean {
		if (slot.isDisabled() && this.panel.areDisabledSlotsHidden()) return true;

		if (slot.isEmpty() && this.panel.areEmptySlotsHidden()) return true;

		return false;
	}

	private decorateSlot(ctx: SlotContext): void {
		const disabledClass = ctx.slot.isDisabled() ? 'disabled' : '';
		const noneClass = ctx.slot.isEmpty() ? 'none' : '';

		const valueEl = document.createElement('div');
		const beginInlineEdit = () => this.beginInlineEdit(ctx, valueEl);

		valueEl.classList.add(
			'slot-value',
			...[disabledClass, noneClass].filter(Boolean)
		);
		valueEl.title = ctx.slot.value;
		valueEl.textContent = ctx.slot.value;
		this.addDoubleTapEventListener(
			valueEl,
			beginInlineEdit
		);
		ctx.slotElement.appendChild(valueEl);

		const toggleBtn = document.createElement('button');
		toggleBtn.className = 'slot-button slot-toggle';

		const enabled = ctx.slot.isEnabled();
		toggleBtn.classList.add(enabled ? 'is-enabled' : 'is-disabled');
		toggleBtn.textContent = enabled ? 'Disable' : 'Enable';

		toggleBtn.addEventListener('click', () => {
			this.outfitView.toggleSlot(ctx.slot.id);
			this.outfitManager.updateOutfitValue(ctx.slot.id);
			this.panel.saveAndRenderContent();
		});

		ctx.actionsLeftEl.appendChild(toggleBtn);


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
		moveBtn.addEventListener(
			'click',
			() => this.moveSlot(ctx.slot)
		);
		ctx.actionsLeftEl.appendChild(moveBtn);


		const changeSlotBtn = document.createElement('button');
		changeSlotBtn.classList.add('slot-button', 'slot-change');
		changeSlotBtn.textContent = '✏️';
		changeSlotBtn.addEventListener(
			'click',
			beginInlineEdit
		);
		ctx.actionsRightEl.appendChild(changeSlotBtn);


		this.addDoubleTapEventListener(
			ctx.slotElement.querySelector<HTMLDivElement>('.slot-name')!,
			() => this.beginRename(ctx.slotElement, ctx.slot)
		);
	}

	private removeActionButtons(slotElement: HTMLDivElement): void {
		const selectors = ['.slot-toggle', '.delete-slot', '.slot-shift', '.slot-change', '.move-slot'];
		for (const selector of selectors) {
			slotElement.querySelector<HTMLButtonElement>(selector)?.remove();
		}
	}

	private toSlotId(slotName: string): string {
		return slotName
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9\s-]/g, '') // drop punctation/symbols
			.replace(/\s+/g, '-') // space → hyphens
			.replace(/-+/g, '-'); // collapse repeat hyphens
	}


	private addDoubleTapEventListener(element: HTMLElement, listener: () => void): void {
		const DOUBLE_TAP_MS = 300;
		let lastTapTime = 0;

		element.addEventListener('click', () => {
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

	/* ------------------------------- Slot Moving ------------------------------ */

	private moveSlot(slot: OutfitSlot): void {
		const kind = prompt('Move slot to kind:')?.trim();
		if (!kind) return;

		const result = this.outfitView.moveToKind(slot.id, kind);
		switch (result) {
			case "slot-not-found":
				throw new Error(`Could not find slot "${slot.id}" when moving to "${kind}"`);
			case "noop":
				return;
			case "moved":
				this.panel.saveAndRenderContent();
				return;
			default: assertNever(result);
		}
	}

	/* ------------------------------ Slot Deletion ----------------------------- */

	private askDeleteSlot(slotElement: HTMLDivElement, slot: ResolvedOutfitSlot): void {
		const confirmed = window.confirm('Are you sure you want to delete this slot?');

		if (confirmed) {
			this.outfitManager.deleteOutfitSlot(slot.id);
		}

		this.panel.saveAndRenderContent();
	}

	/* ------------------------------ Slot Shifting ----------------------------- */

	private beginSlotShift(slotElement: HTMLDivElement, display: DisplaySlot): void {
		this.removeActionButtons(slotElement);

		const select = document.createElement('select');
		select.className = 'slot-shift-select';

		const options: { label: string; targetDisplayIndex: number | null; }[] = [];
		const displaySlots = this.currentDisplaySlots;

		const placeholder = document.createElement('option');
		placeholder.textContent = 'Move slot...';
		placeholder.disabled = true;
		placeholder.selected = true;
		placeholder.value = '';
		select.appendChild(placeholder);

		for (const ds of displaySlots) {
			if (ds.slot.id === display.slot.id) continue; // skip self

			// Skip no-op: already before this slot
			if (ds.displayIndex === display.displayIndex + 1) continue;

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

		slotElement.querySelector('.slot-actions')!.appendChild(select);
		select.focus();

		select.addEventListener('change', () => this.shiftSlot(select, display));

		select.addEventListener('blur', () => {
			this.panel.renderContent();
		});
	}

	private shiftSlot(select: HTMLSelectElement, display: DisplaySlot): void {
		const displaySlots = this.currentDisplaySlots;
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

		this.panel.saveAndRenderContent();
	}

	/* --------------------------- Slot Label Renaming -------------------------- */

	private beginRename(slotElement: HTMLDivElement, slot: ResolvedOutfitSlot): void {
		const labelEl = slotElement.querySelector('.slot-name') as HTMLDivElement;

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

	private commitRename(slot: ResolvedOutfitSlot, textarea: HTMLTextAreaElement): void {
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

		this.panel.saveAndRenderContent();
	}

	private cancelRename(): void {
		this.panel.renderContent();
	}


	/* --------------------------- Slot Value Editing --------------------------- */

	private beginInlineEdit(
		ctx: SlotContext,
		valueEl: HTMLDivElement,
	) {
		const scrollTop = ctx.scroller.scrollTop;
		const rect = valueEl.getBoundingClientRect();

		const originalValue = valueEl.innerText.trim();
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

		textarea.addEventListener('input', autoResize);

		this.removeActionButtons(ctx.slotElement);

		textarea.addEventListener('keydown', (e) => {
			if (e.isComposing) return;

			if (!isMobile() && e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				this.commitValueEdit(textarea, ctx.displaySlot.slot);
			}
			else if (e.key === 'Escape') {
				e.preventDefault();
				this.cancelValueEdit();
			}
		});

		if (!empty) {
			const clearBtn = document.createElement('button');
			clearBtn.classList.add('slot-button', 'clear-button');
			clearBtn.textContent = 'Clear';
			ctx.actionsLeftEl.appendChild(clearBtn);

			clearBtn.addEventListener('click', async () => {
				await this.outfitManager.setOutfitItem(ctx.slot.id, 'None');
				this.panel.renderContent();
			});
		}

		const cancelBtn = document.createElement('button');
		cancelBtn.classList.add('slot-button', 'cancel-button');
		cancelBtn.textContent = 'Cancel';
		ctx.actionsRightEl.appendChild(cancelBtn);

		cancelBtn.addEventListener('click', () => this.cancelValueEdit());



		const saveBtn = document.createElement('button');
		saveBtn.classList.add('slot-button', 'save-button');
		saveBtn.textContent = 'Save';
		ctx.actionsRightEl.appendChild(saveBtn);

		saveBtn.addEventListener('click', async () => this.commitValueEdit(textarea, ctx.slot));
	}

	private async commitValueEdit(textarea: HTMLTextAreaElement, slot: ResolvedOutfitSlot): Promise<void> {
		const newValue = textarea.value.trim() === ''
			? 'None'
			: textarea.value.trim();

		await this.outfitManager.setOutfitItem(slot.id, newValue);
		this.panel.saveAndRenderContent();
	}

	private cancelValueEdit(): void {
		this.panel.renderContent();
	}
}