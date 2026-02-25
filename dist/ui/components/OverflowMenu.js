import { el } from "../../util/ElementHelper.js";
import { EventBus } from "../../util/EventBus.js";
export class OverflowMenuFactory {
    constructor() {
        this.openMenu = null;
    }
    create(deps) {
        const menu = new OverflowMenu(deps);
        menu.onOpen(() => {
            this.openMenu?.closeMenu();
            this.openMenu = menu;
        });
        return menu;
    }
}
export class OverflowMenu {
    constructor(deps) {
        this.deps = deps;
        this.menu = null;
        this.openBus = new EventBus();
        this.closeBus = new EventBus();
        this.handleOutsideClick = (e) => {
            if (!this.menu)
                return;
            if (this.menu.contains(e.target))
                return;
            if (this.deps.openerEl.contains(e.target))
                return;
            this.closeMenu();
        };
    }
    openMenu() {
        if (this.menu)
            return;
        this.openBus.call();
        this.menu = this.buildMenu();
        document.addEventListener('click', this.handleOutsideClick);
        this.deps.disposer.add(() => this.closeMenu());
    }
    closeMenu() {
        if (!this.menu)
            return;
        this.menu.remove();
        this.menu = null;
        document.removeEventListener('click', this.handleOutsideClick);
        this.closeBus.call();
    }
    toggleMenu() {
        return this.menu ? this.closeMenu() : this.openMenu();
    }
    onOpen(listener) {
        this.openBus.add(listener);
        return this;
    }
    onClose(listener) {
        this.closeBus.add(listener);
        return this;
    }
    onClopen(listener) {
        this.openBus.add(() => listener(true));
        this.closeBus.add(() => listener(false));
        return this;
    }
    buildMenu() {
        const menu = el('div', this.deps.options);
        this.positionMenu(menu);
        return menu;
    }
    get invAlign() {
        return this.deps.align === 'left' ? 'right' : 'left';
    }
    positionMenu(menu) {
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
