import { TraitSlotState } from "../../../data/model/OutfitSnapshots.js";
import { el } from "../../../util/ElementHelper.js";
import { TraitSlotContenter } from "../content/trait-content.js";
import { SlotActionsElement } from "../SlotActionsElement.js";
import { SlotImageElement } from "../SlotImageController.js";
import { BaseSlotRenderer, SlotContext, SlotRendererDeps } from "./base-slot.js";

export type TraitSlotContext = SlotContext<TraitSlotState>;

export class TraitSlotRenderer extends BaseSlotRenderer<TraitSlotState> {
	private readonly contenter: TraitSlotContenter;

	public constructor(
		deps: SlotRendererDeps
	) {
		super(deps);

		this.contenter = new TraitSlotContenter({
			panel: this.panel
		});
	}

	protected override renderContent(
		ctx: TraitSlotContext,
		_imageElement: SlotImageElement
	): void {
		this.contenter.render(ctx.contentTextEl, ctx);
	}

	protected override decorateMinimal(
		ctx: TraitSlotContext
	): void {
		ctx.labelRightDiv.append(
			this.createToggleBtn(ctx.slot)
		);

		if (ctx.slot.isEmpty()) {
			ctx.labelDiv.classList.add('minimized');
		}

		this.createMenuBtn(ctx).appendTo(ctx.labelRightDiv);
	}

	protected override decorate(
		ctx: TraitSlotContext,
		_imageElement: SlotImageElement
	): void {
		const actions = new SlotActionsElement(this.panel);

		ctx.actionsLeftEl.append(
			this.createToggleBtn(ctx.slot)
		);

		if (ctx.slot.enabled) {
			ctx.actionsLeftEl.append(
				actions.createUnequipButton(ctx.slot)
			);
		}

		this.createMenuBtn(ctx).appendTo(ctx.actionsRightEl);
	}

	private createMenuBtn(
		ctx: TraitSlotContext
	): { appendTo(parent: HTMLElement): void; } {
		const button = el('button', {
			className: 'slot-button slot-overflow-button',
			text: '⋯'
		});

		const menu = this.deps.overflowMenuFactory.create({
			openerEl: button,
			onDispose: this.panel.onRenderDispose,
			align: 'right',
			options: {
				className: 'slot-overflow-menu',
				parent: ctx.slotElement
			},
			getViewBoundary: () =>
				ctx.scroller.getBoundingClientRect()
		});

		const actions = [
			{
				className: 'delete-slot',
				text: 'Delete',
				run: () => this.askDeleteSlot(
					ctx.slotElement,
					ctx.slot
				)
			},
			{
				className: 'slot-shift',
				text: 'Shift',
				run: () => this.beginSlotShift(ctx)
			},
			{
				className: 'move-slot',
				text: 'Move',
				run: () => this.moveSlot(ctx.slot)
			}
		];

		menu.onBuild(menuEl => {
			for (const action of actions) {
				menuEl.append(el('button', {
					className: `slot-button ${action.className}`,
					text: action.text,
					events: {
						click: () => {
							menu.closeMenu();
							action.run();
						}
					}
				}));
			}
		});

		menu.onClopen(open => {
			ctx.slotElement.classList.toggle('--menu-open', open);
		});

		button.addEventListener('click', event => {
			event.stopPropagation();
			menu.toggleMenu();
		});

		return {
			appendTo(parent) {
				parent.append(button);
			}
		};
	}
}
