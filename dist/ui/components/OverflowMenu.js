import { el } from "../../util/ElementHelper.js";
import { EventBus } from "../../util/EventBus.js";
import { clamp } from "../../util/math.js";
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
        this.buildBus = new EventBus();
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
        this.deps.onDispose(() => this.closeMenu());
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
    onBuild(listener) {
        this.buildBus.add(listener);
        return this;
    }
    buildMenu() {
        const menu = el('div', this.deps.options);
        this.buildBus.call(menu);
        this.positionMenu(menu);
        return menu;
    }
    get invAlign() {
        return this.deps.align === 'left' ? 'right' : 'left';
    }
    positionMenu(menuEl) {
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
