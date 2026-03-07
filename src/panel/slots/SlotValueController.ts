import { OutfitSlotState } from "../../data/model/OutfitSnapshots.js";
import { isWideScreen, scrollIntoViewAboveKeyboard } from "../../shared.js";
import { PanelType } from "../../types/maps.js";
import { SlotValueText } from "../../ui/components/SlotValueText.js";
import { popupConfirm } from "../../util/adapter/popup-adapter.js";
import { substituteParams } from "../../util/adapter/script-adapter.js";
import { addDoubleTapListener } from "../../util/element/click-actions.js";
import { addLongPressAction, createElement, el } from "../../util/ElementHelper.js";
import { EventBus } from "../../util/EventBus.js";
import { branch } from "../../util/logic.js";
import { OutfitPanelContext } from "../base/OutfitPanelContext.js";
import { OutfitPanel } from "../OutfitPanel.js";
import { SlotContext } from "./SlotRenderer.js";


interface MacroMatch {
	full: string;
	content: string;
	index: number;
	end: number;
}

function iterateMacros(value: string): Iterable<MacroMatch> {
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

	private readonly renderBus = new EventBus<(valueEl: HTMLDivElement) => void>();

	public constructor(
		panel: OutfitPanel<PanelType>,
		private readonly removeActionButtons: (ctx: SlotContext) => void
	) {
		super(panel);
	}

	public onRender(listener: (valueEl: HTMLDivElement) => void): this {
		this.renderBus.add(listener);
		return this;
	}

	public render(container: HTMLDivElement, ctx: SlotContext): HTMLDivElement {
		const disabledClass = ctx.slot.isDisabled() ? 'disabled' : '';
		const noneClass = ctx.slot.isEmpty() ? 'none' : '';

		const valueEl = document.createElement('div');

		valueEl.classList.add(
			'slot-value',
			...[disabledClass, noneClass].filter(Boolean)
		);

		const valueRenderer = new SlotValueText({
			showPromptModal: this.showPromptModal.bind(this),
			expandValue: () => {
				valueEl.classList.add('--reveal');
				this.updateOverflowState(valueEl);
			}
		});

		valueEl.replaceChildren(
			valueRenderer.createFrag(ctx.slot.value)
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
				this.showPromptModal(prompt);
			},
			{ stopImmediatePropagation: true }
		);

		valueEl.addEventListener('click', () => {
			valueEl.classList.toggle('--reveal');
			this.updateOverflowState(valueEl);
		});

		container.appendChild(valueEl);
		this.updateOverflowState(valueEl);
		this.renderBus.emit(valueEl);
		return valueEl;
	}

	private updateOverflowState(el: HTMLElement): void {
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
	) {
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
			if (e.isComposing) return;

			if (isWideScreen() && e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				this.commitValueEdit(textarea, ctx.displaySlot.slot);
			}
			else if (e.key === 'Escape') {
				e.preventDefault();
				this.cancelValueEdit();
			}
		});

		const preventBlur = (btn: HTMLButtonElement) =>
			btn.addEventListener('pointerdown', e => e.preventDefault());

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

		const updateTokenCount = () =>
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
			this.commitValueEdit(textarea, ctx.slot);
		});
		preventBlur(saveBtn);

		ctx.actionsRightEl.appendChild(saveBtn);
	}

	private async commitValueEdit(textarea: HTMLTextAreaElement, slot: OutfitSlotState): Promise<void> {
		const newValue = textarea.value.trim() === ''
			? 'None'
			: textarea.value.trim();

		await this.outfitManager.setOutfitItem(slot.id, newValue);
		this.panel.saveAndRender();
	}

	private cancelValueEdit(): void {
		this.panel.renderTabsAndActiveContent();
	}
}