import { RequireKeys } from "../../types/utility.js";
import { el, ElementOptions } from "../../util/ElementHelper.js";
import { EventBus } from "../../util/EventBus.js";
import { clamp } from "../../util/math.js";


export interface OverflowMenuDeps {
	openerEl: HTMLElement;
	onDispose: (fn: () => void) => void;
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
	private readonly buildBus = new EventBus<(menu: HTMLDivElement) => void>();

	private readonly handleOutsideClick = (e: MouseEvent): void => {
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

		this.openBus.emit();
		this.menu = this.buildMenu();
		document.addEventListener('click', this.handleOutsideClick);
		this.deps.onDispose(() => this.closeMenu());
	}

	public closeMenu(): void {
		if (!this.menu) return;

		this.menu.remove();
		this.menu = null;
		document.removeEventListener('click', this.handleOutsideClick);
		this.closeBus.emit();
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

	public onBuild(listener: (menu: HTMLDivElement) => void): this {
		this.buildBus.add(listener);
		return this;
	}


	private buildMenu(): HTMLDivElement {
		const menu = el('div', this.deps.options);
		this.buildBus.emit(menu);
		this.positionMenu(menu);
		return menu;
	}

	private get invAlign(): 'left' | 'right' {
		return this.deps.align === 'left' ? 'right' : 'left';
	}

	private positionMenu(menuEl: HTMLDivElement): void {
		const parentRect = this.deps.options.parent.getBoundingClientRect();
		const openerRect = this.deps.openerEl.getBoundingClientRect();
		const viewRect = this.deps.getViewBoundary();

		const x = {
			'left': openerRect.left - parentRect.left,
			'right': parentRect.right - openerRect.right
		}[this.deps.align];

		const menuWidth = menuEl.offsetWidth;
		const parentWidth = parentRect.width;
		const padding = 8;

		const finalX = clamp({ value: x, min: padding, max: parentWidth - menuWidth - padding });

		menuEl.style[this.deps.align] = `${finalX}px`;
		menuEl.style[this.invAlign] = 'auto';

		const spaceBelow = viewRect.bottom - openerRect.bottom;
		const spaceAbove = openerRect.top - viewRect.top;

		const menuHeight = menuEl.offsetHeight;
		const openUp = spaceBelow < menuHeight && spaceAbove > spaceBelow;

		menuEl.classList.toggle('--open-up', openUp);

		if (openUp) {
			const bottom = parentRect.bottom - openerRect.top;
			menuEl.style.bottom = `${bottom}px`;
			menuEl.style.top = 'auto';
		}
		else {
			const top = openerRect.bottom - parentRect.top;
			menuEl.style.top = `${top}px`;
			menuEl.style.bottom = 'auto';
		}
	}
}