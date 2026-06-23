import { ChatOutfitStorage } from "../../api/chat-metadata.js";
import { OutfitSlotState } from "../../data/model/OutfitSnapshots.js";
import { isWideScreen, scrollIntoViewAboveKeyboard } from "../../shared.js";
import { PanelType } from "../../types/maps.js";
import { SlotValueText } from "../../ui/components/SlotValueText.js";
import { popupConfirm } from "../../util/adapter/popup-adapter.js";
import { substituteParams } from "../../util/adapter/script-adapter.js";
import { addDoubleTapListener } from "../../util/element/click-actions.js";
import { triggerAfterLayout, triggerAfterTransition } from "../../util/element/css.js";
import { addLongPressAction, createElement, el } from "../../util/ElementHelper.js";
import { EventBus, Listener } from "../../util/EventBus.js";
import { OutfitPanelContext } from "../base/OutfitPanelContext.js";
import { OutfitPanel } from "../OutfitPanel.js";
import { EditCoordinator } from "./edit-coordinator.js";
import { SlotContext } from "./SlotRenderer.js";
import * as SlotPresetsApi from "../../api/internal/slot-preset.js";

export interface SlotValueDeps {
	panel: OutfitPanel<PanelType>;
	removeActionButtons: (ctx: SlotContext) => void;
	editCoordinator: EditCoordinator;
}

export interface SlotValueRenderReturn {
	valueEl: HTMLDivElement;
}

export type RenderEvent = {
	ctx: SlotContext,
	valueEl: HTMLDivElement;
	isFor: (otherCtx: SlotContext) => boolean;
};

export class SlotValueController extends OutfitPanelContext {

	private readonly renderBus = new EventBus<(event: RenderEvent) => void>();

	public constructor(
		private readonly deps: SlotValueDeps
	) {
		super(deps.panel);
	}

	public onRender(listener: Listener<typeof this.renderBus>): this {
		this.renderBus.add(listener);
		return this;
	}

	public render(container: HTMLDivElement, ctx: SlotContext): SlotValueRenderReturn {
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

		// set text
		valueEl.replaceChildren(
			valueRenderer.createFrag(this.getSlotText(ctx.slot))
		);

		addDoubleTapListener(
			valueEl,
			() => this.beginInlineEdit(ctx, valueEl)
		);

		addLongPressAction(
			valueEl,
			300,
			() => {
				const text = valueEl.textContent;
				const prompt = substituteParams(text);
				void this.showPromptModal(prompt);
			},
			{ stopImmediatePropagation: true }
		);

		valueEl.addEventListener('click', () => {
			valueEl.classList.toggle('--reveal');
			this.updateOverflowState(valueEl);
		});

		container.appendChild(valueEl);

		triggerAfterLayout(valueEl, () => this.updateOverflowState(valueEl));

		this.renderBus.emit({
			ctx,
			valueEl,
			isFor: (otherCtx: SlotContext) => otherCtx.slot.id === ctx.slot.id
		});
		return {
			valueEl
		};
	}

	public setCollapsedMaxHeight(valueEl: HTMLElement, height: number | null): void {
		if (height === null) {
			valueEl.style.removeProperty('--collapsed-max-height');
		}
		else {
			valueEl.style.setProperty('--collapsed-max-height', `${height}px`);
		}

		triggerAfterTransition(valueEl, 'max-height', () => this.updateOverflowState(valueEl));
	}

	private updateOverflowState(el: HTMLElement): void {
		if (el.classList.contains('--reveal')) {
			el.classList.remove('--overflowing');
			return;
		}

		const isActuallyOverflowing = el.scrollHeight - el.clientHeight > 1;
		const isVisuallyLarge = this.isHeightAboveDefault(el);

		el.classList.toggle(
			'--overflowing',
			isActuallyOverflowing || isVisuallyLarge
		);
	}

	private isHeightAboveDefault(el: HTMLElement): boolean {
		const style = getComputedStyle(el);

		const lineHeight = parseFloat(style.lineHeight);
		const defaultMaxHeight = (lineHeight * 6) + 12;

		const height = el.getBoundingClientRect().height;

		return height > defaultMaxHeight + 1; // +1 to dodge subpixel noise
	}

	private async showPromptModal(promptText: string): Promise<void> {
		const container = createElement('div', 'flex-container flexFlowColumn height100p');

		const textarea = createElement('textarea', 'flex1 monospace textarea_compact');
		textarea.value = promptText;
		textarea.readOnly = true;
		textarea.style.resize = 'none';
		textarea.style.maxHeight = '90dvh';
		container.append(textarea);

		await popupConfirm(
			container,
			{
				title: 'Prompt',
				wide: true,
				cancelText: false,
				leftAlign: true,
				large: true
			}
		);
	}

	public beginInlineEdit(
		ctx: SlotContext,
		valueEl: HTMLDivElement,
	): boolean {
		if (!this.deps.editCoordinator.canEdit(valueEl)) return false;

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

		textarea.style.height = `${rect.height}px`;

		// Swap value box with editor
		valueEl.replaceWith(textarea);
		ctx.scroller.scrollTop = scrollTop;

		const autoResize = (): void => {
			const prevScroll = ctx.scroller.scrollTop;

			textarea.style.height = 'auto';
			textarea.style.height = `${textarea.scrollHeight}px`;

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
		const onVvChange = (): void => scrollIntoViewAboveKeyboard(ctx.scroller, textarea);

		vv?.addEventListener('resize', onVvChange);
		vv?.addEventListener('scroll', onVvChange);

		const cleanup = (): void => {
			vv?.removeEventListener('resize', onVvChange);
			vv?.removeEventListener('scroll', onVvChange);
		};

		this.deps.removeActionButtons(ctx);

		textarea.addEventListener('keydown', (e) => {
			if (e.isComposing) return;

			if (isWideScreen() && e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				void this.commitValueEdit(textarea, ctx.displaySlot.slot);
			}
			else if (e.key === 'Escape') {
				e.preventDefault();
				this.cancelValueEdit();
			}
		});

		const preventBlur = (btn: HTMLButtonElement): void =>
			btn.addEventListener('pointerdown', e => e.preventDefault());

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

		const updateTokenCount = (): string =>
			tokenCounter.textContent = `Tokens:\n${Math.ceil(textarea.value.length / 4)}`;

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

	private async commitValueEdit(textarea: HTMLTextAreaElement, slot: OutfitSlotState): Promise<void> {
		const text = textarea.value.trim() === ''
			? this.getEmptyText()
			: textarea.value.trim();

		await this.updateSlotText(slot, text);
		this.panel.saveAndRender();
	}

	private cancelValueEdit(): void {
		this.panel.renderTabsAndActiveContent();
	}



	protected getValueElClassName(): string {
		return 'slot-value slot-textbox';
	}

	protected getEditBoxClassName(): string {
		return 'slot-editbox';
	}

	protected getSlotText(slot: OutfitSlotState): string {
		return slot.value;
	}

	public isEmpty(slot: OutfitSlotState): boolean {
		return this.getSlotText(slot) === this.getEmptyText();
	}

	protected async updateSlotText(slot: OutfitSlotState, text: string): Promise<void> {
		this.syncPresetFromEditedValue(slot, text);
		await this.outfitManager.updateSlotValue(slot.id, text);
	}

	private syncPresetFromEditedValue(slot: OutfitSlotState, text: string): void {
		if (!SlotPresetsApi.canSync(slot)) return;

		const step = SlotPresetsApi.beginSaveSlotAsPresetFromImageTag({
			slot: {
				value: text,
				getActiveImageState: () => slot.getActiveImageState(),
				hasPreset: (preset) => slot.hasPreset(preset)
			}
		});

		if (step.type !== 'ready') return;

		step.save();
	}

	protected getEmptyText(): string {
		return 'None';
	}
}

export class SlotChatAddendumController extends SlotValueController {

	protected override getValueElClassName(): string {
		return 'slot-addendum slot-textbox';
	}

	protected override getEditBoxClassName(): string {
		return 'slot-editbox';
	}

	protected override getSlotText(slot: OutfitSlotState): string {
		return ChatOutfitStorage.getAddendum(this.getCharacter(), slot.id) ?? this.getEmptyText();
	}

	protected override async updateSlotText(slot: OutfitSlotState, text: string): Promise<void> {
		if (!text || text === this.getEmptyText()) {
			ChatOutfitStorage.removeAddendum(this.getCharacter(), slot.id);
			return;
		}

		ChatOutfitStorage.saveAddendum(this.getCharacter(), slot.id, text);
	}

	protected override getEmptyText(): string {
		return '(+)';
	}

	private getCharacter(): string {
		return this.panel.outfitManager.getName();
	}
}