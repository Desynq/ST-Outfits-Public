import { OverflowMenu, OverflowMenuFactory } from "../../ui/components/OverflowMenu.js";
import { el, ElementOptions } from "../../util/ElementHelper.js";
import { EventBus } from "../../util/EventBus.js";
import { Disposer } from "../Disposer.js";




export interface SlotActionMenuDeps {
	mountEl: HTMLElement;
	getViewBoundary: () => DOMRect;
	onDispose: (fn: () => void) => void;
	deleteSlot(): void;
	shiftSlot(): void;
	moveSlot(): void;
	showPresets(): void;
}

export class SlotActionsMenuElement {
	private readonly btn: HTMLButtonElement;
	private readonly menu: OverflowMenu;


	public constructor(
		private readonly deps: SlotActionMenuDeps,
		private readonly factory: OverflowMenuFactory
	) {
		this.btn = el('button', {
			className: 'slot-button slot-overflow-button',
			text: '⋯'
		});

		this.menu = this.factory.create({
			openerEl: this.btn,
			onDispose: this.deps.onDispose,
			align: 'right',
			options: {
				className: 'slot-overflow-menu',
				parent: this.deps.mountEl,
				children: this.buildMenuChildren()
			},
			getViewBoundary: this.deps.getViewBoundary
		});

		this.btn.addEventListener('click', (e) => {
			e.stopPropagation();
			this.menu.toggleMenu();
		});
	}

	public appendTo(parent: HTMLElement): this {
		parent.append(this.btn);
		return this;
	}

	public closeMenu(): void {
		this.menu.closeMenu();
	}

	public onOpen(listener: () => void): this {
		this.menu.onOpen(listener);
		return this;
	}

	public onClose(listener: () => void): this {
		this.menu.onClose(listener);
		return this;
	}

	public onClopen(listener: (open: boolean) => void): this {
		this.menu.onClopen(listener);
		return this;
	}

	private buildMenuChildren(): HTMLElement[] {
		return [
			this.createDeleteBtn(),
			this.createShiftBtn(),
			this.createMoveBtn(),
			this.createPresetsBtn()
		];
	}


	private createBtn(options: ElementOptions<'button'>): HTMLButtonElement {
		const self = this;
		const { events, ...rest } = options;
		const subClick = events?.click;

		return el('button', {
			...rest,
			events: {
				...events,
				click: function (this: HTMLButtonElement, e) {
					self.menu.closeMenu();
					subClick?.call(this, e);
				}
			}
		});
	}

	private createDeleteBtn(): HTMLButtonElement {
		return this.createBtn({
			className: 'slot-button delete-slot',
			text: 'Delete',
			events: {
				click: () => this.deps.deleteSlot()
			}
		});
	}

	private createShiftBtn(): HTMLButtonElement {
		return this.createBtn({
			className: 'slot-button slot-shift',
			text: 'Shift',
			events: {
				click: () => this.deps.shiftSlot()
			}
		});
	}

	private createMoveBtn(): HTMLButtonElement {
		return this.createBtn({
			className: 'slot-button move-slot',
			text: 'Move',
			events: {
				click: () => this.deps.moveSlot()
			}
		});
	}

	private createPresetsBtn(): HTMLButtonElement {
		return this.createBtn({
			className: 'slot-button slot-presets-button',
			text: 'Presets',
			events: {
				click: () => this.deps.showPresets()
			}
		});
	}
}