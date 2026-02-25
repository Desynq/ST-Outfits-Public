import { RequireKeys } from "../../../types/utility.js";
import { Disposer } from "../../panel/Disposer.js";
import { el, ElementOptions } from "../../util/ElementHelper.js";
import { EventBus } from "../../util/EventBus.js";


export interface OverflowMenuDeps {
	openerEl: HTMLElement;
	disposer: Disposer;
	align: 'left' | 'right';
	options: RequireKeys<ElementOptions<'div'>, 'className' | 'parent'>;
	getViewBoundary(): DOMRect;
}

export class OverflowMenuFactory {
	private openMenu: OverflowMenu | null = null;

	public create(deps: OverflowMenuDeps): OverflowMenu {
		const menu = new OverflowMenu(deps);
		menu.onOpen(() => {
			this.openMenu?.closeMenu();
			this.openMenu = menu;
		});

		return menu;
	}
}

export class OverflowMenu {
	private menu: HTMLDivElement | null = null;

	private readonly openBus = new EventBus<() => void>();
	private readonly closeBus = new EventBus<() => void>();

	private readonly handleOutsideClick = (e: MouseEvent) => {
		if (!this.menu) return;
		if (this.menu.contains(e.target as Node)) return;
		if (this.deps.openerEl.contains(e.target as Node)) return;

		this.closeMenu();
	};

	public constructor(
		private readonly deps: OverflowMenuDeps
	) { }

	public openMenu(): void {
		if (this.menu) return;

		this.openBus.call();
		this.menu = this.buildMenu();
		document.addEventListener('click', this.handleOutsideClick);
		this.deps.disposer.add(() => this.closeMenu());
	}

	public closeMenu(): void {
		if (!this.menu) return;

		this.menu.remove();
		this.menu = null;
		document.removeEventListener('click', this.handleOutsideClick);
		this.closeBus.call();
	}

	public toggleMenu(): void {
		return this.menu ? this.closeMenu() : this.openMenu();
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


	private buildMenu(): HTMLDivElement {
		const menu = el('div', this.deps.options);
		this.positionMenu(menu);
		return menu;
	}

	private get invAlign(): 'left' | 'right' {
		return this.deps.align === 'left' ? 'right' : 'left';
	}

	private positionMenu(menu: HTMLDivElement): void {
		const parentRect = this.deps.options.parent.getBoundingClientRect();
		const openerRect = this.deps.openerEl.getBoundingClientRect();
		const viewRect = this.deps.getViewBoundary();

		const x = parentRect[this.deps.align] - openerRect[this.deps.align];
		menu.style[this.deps.align] = `${x}px`;
		menu.style[this.invAlign] = 'auto';

		const spaceBelow = viewRect.bottom - openerRect.bottom;
		const spaceAbove = openerRect.top - viewRect.top;

		const menuHeight = menu.offsetHeight;
		const up = spaceBelow < menuHeight && spaceAbove > spaceBelow;
		menu.classList.toggle('--open-up', up);

		if (up) {
			menu.style.bottom = `${parentRect.bottom - openerRect.top}px`;
			menu.style.top = 'auto';
		}
		else {
			menu.style.top = `${openerRect.bottom - parentRect.top}px`;
			menu.style.bottom = 'auto';
		}
	}
}