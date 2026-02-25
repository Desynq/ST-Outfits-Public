import { el, ElementOptions } from "../../util/ElementHelper.js";
import { EventBus } from "../../util/EventBus.js";
import { Disposer } from "../Disposer.js";




interface Deps {
	mountEl: HTMLElement;
	getViewBoundary: () => DOMRect;
	disposer: Disposer;
	deleteSlot(): void;
	shiftSlot(): void;
	moveSlot(): void;
	showPresets(): void;
}

export class SlotActionOverflowFactory {
	private openInstance: SlotActionOverflowElement | null = null;

	public create(deps: Deps): SlotActionOverflowElement {
		const element = new SlotActionOverflowElement(deps);
		element.onOpen(() => {
			this.openInstance?.closeMenu();
			this.openInstance = element;
		});

		return element;
	}
}

class SlotActionOverflowElement {
	private readonly btn: HTMLButtonElement;
	private menu: HTMLDivElement | null = null;

	private readonly openBus = new EventBus<() => void>();
	private readonly closeBus = new EventBus<() => void>();

	private handleOutsideClick = (e: MouseEvent) => {
		if (!this.menu) return;
		if (this.menu.contains(e.target as Node)) return;
		if (this.btn.contains(e.target as Node)) return;

		this.closeMenu();
	};


	public constructor(
		private readonly deps: Deps
	) {
		this.btn = el('button', {
			className: 'slot-button slot-overflow-button',
			text: '⋯',
			events: {
				click: (e) => {
					e.stopPropagation();
					this.toggleMenu();
				}
			}
		});
		this.deps.disposer.add(() => this.closeMenu());
	}

	public appendTo(parent: HTMLElement): this {
		parent.append(this.btn);
		return this;
	}

	public onOpen(listener: () => void): this {
		this.openBus.add(listener);
		return this;
	}

	public onClose(listener: () => void): this {
		this.closeBus.add(listener);
		return this;
	}

	public onClopen(listener: (open: boolean) => void): this {
		this.openBus.add(() => listener(true));
		this.closeBus.add(() => listener(false));
		return this;
	}

	public closeMenu(): void {
		this.menu?.remove();
		document.removeEventListener('click', this.handleOutsideClick);
		this.menu = null;
		this.closeBus.call();
	}

	private toggleMenu(): void {
		if (this.menu) {
			this.closeMenu();
			return;
		}

		this.openBus.call();
		this.menu = this.buildMenu();
		this.deps.mountEl.append(this.menu);
		document.addEventListener('click', this.handleOutsideClick);
	}

	private buildMenu(): HTMLDivElement {
		const menu = el('div', {
			className: 'slot-overflow-menu',
			children: [
				this.createDeleteBtn(),
				this.createShiftBtn(),
				this.createMoveBtn(),
				this.createPresetsBtn()
			]
		});
		this.positionMenu(menu);

		return menu;
	}

	private positionMenu(menu: HTMLDivElement): void {
		const mountRect = this.deps.mountEl.getBoundingClientRect();
		const btnRect = this.btn.getBoundingClientRect();
		const scrollRect = this.deps.getViewBoundary();

		// Horizontal alignment (relative to mountEl)
		const right = mountRect.right - btnRect.right;
		menu.style.right = `${right}px`;
		menu.style.left = 'auto';

		// Vertical flip based on scroll container
		const spaceBelow = scrollRect.bottom - btnRect.bottom;
		const spaceAbove = btnRect.top - scrollRect.top;

		if (spaceBelow < 180 && spaceAbove > spaceBelow) {
			menu.classList.add('--open-up');
			menu.style.bottom = `${mountRect.bottom - btnRect.top}px`;
			menu.style.top = 'auto';
		} else {
			menu.style.top = `${btnRect.bottom - mountRect.top}px`;
			menu.style.bottom = 'auto';
		}
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
					self.closeMenu();
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