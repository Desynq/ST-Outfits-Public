import { OutfitSlotState } from "../../data/model/OutfitSnapshots.js";
import { isWideScreen, scrollIntoViewAboveKeyboard } from "../../shared.js";
import { PanelType } from "../../types/maps.js";
import { popupConfirm } from "../../util/adapter/popup-adapter.js";
import { substituteParams } from "../../util/adapter/script-adapter.js";
import { addDoubleTapListener } from "../../util/element/click-actions.js";
import { addLongPressAction, createElement } from "../../util/ElementHelper.js";
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
	const regex = /\{\{(.+?)\}\}/g;
	return (function* () {
		for (const match of value.matchAll(regex)) {
			const full = match[0];
			const content = match[1];
			const index = match.index!;
			yield {
				full,
				content,
				index,
				end: index + full.length
			};
		}
	})();
}

export class SlotValueController extends OutfitPanelContext {

	public constructor(
		panel: OutfitPanel<PanelType>,
		private readonly removeActionButtons: (ctx: SlotContext) => void
	) {
		super(panel);
	}

	public render(container: HTMLDivElement, ctx: SlotContext): HTMLDivElement {
		const disabledClass = ctx.slot.isDisabled() ? 'disabled' : '';
		const noneClass = ctx.slot.isEmpty() ? 'none' : '';

		const valueEl = document.createElement('div');

		valueEl.classList.add(
			'slot-value',
			...[disabledClass, noneClass].filter(Boolean)
		);

		valueEl.replaceChildren(
			this.renderInlineCode(ctx.slot.value)
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

	private renderInlineCode(value: string): DocumentFragment {
		const frag = document.createDocumentFragment();
		const appendText = (start: number, end?: number) => frag.append(
			document.createTextNode(value.slice(start, end))
		);

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

	private createMacroSpan(macro: MacroMatch): HTMLSpanElement {
		// macro static content does not change until rerender
		const text = macro.full;
		const isOutlet = macro.content.startsWith('outlet::');

		const getPrompt = (): string | null => {
			const prompt = substituteParams(text);
			return prompt === text ? null : prompt;
		};

		const span = createElement('span', 'slot-macro-span', text);

		const updateFromPrompt = (): string | null => {
			span.classList.remove('--error', '--char', '--user');

			const addClass = (...tokens: string[]) => span.classList.add(...tokens);

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

	private async commitValueEdit(textarea: HTMLTextAreaElement, slot: OutfitSlotState): Promise<void> {
		const newValue = textarea.value.trim() === ''
			? 'None'
			: textarea.value.trim();

		await this.outfitManager.setOutfitItem(slot.id, newValue);
		this.panel.saveAndRender();
	}

	private cancelValueEdit(): void {
		this.panel.render();
	}
}