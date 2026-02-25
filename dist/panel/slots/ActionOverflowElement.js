import { el } from "../../util/ElementHelper.js";
import { EventBus } from "../../util/EventBus.js";
export class SlotActionOverflowFactory {
    constructor() {
        this.openInstance = null;
    }
    create(deps) {
        const element = new SlotActionOverflowElement(deps);
        element.onOpen(() => {
            this.openInstance?.closeMenu();
            this.openInstance = element;
        });
        return element;
    }
}
class SlotActionOverflowElement {
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
            if (this.btn.contains(e.target))
                return;
            this.closeMenu();
        };
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
    appendTo(parent) {
        parent.append(this.btn);
        return this;
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
    closeMenu() {
        this.menu?.remove();
        document.removeEventListener('click', this.handleOutsideClick);
        this.menu = null;
        this.closeBus.call();
    }
    toggleMenu() {
        if (this.menu) {
            this.closeMenu();
            return;
        }
        this.openBus.call();
        this.menu = this.buildMenu();
        this.deps.mountEl.append(this.menu);
        document.addEventListener('click', this.handleOutsideClick);
    }
    buildMenu() {
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
    positionMenu(menu) {
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
        }
        else {
            menu.style.top = `${btnRect.bottom - mountRect.top}px`;
            menu.style.bottom = 'auto';
        }
    }
    createBtn(options) {
        const self = this;
        const { events, ...rest } = options;
        const subClick = events?.click;
        return el('button', {
            ...rest,
            events: {
                ...events,
                click: function (e) {
                    self.closeMenu();
                    subClick?.call(this, e);
                }
            }
        });
    }
    createDeleteBtn() {
        return this.createBtn({
            className: 'slot-button delete-slot',
            text: 'Delete',
            events: {
                click: () => this.deps.deleteSlot()
            }
        });
    }
    createShiftBtn() {
        return this.createBtn({
            className: 'slot-button slot-shift',
            text: 'Shift',
            events: {
                click: () => this.deps.shiftSlot()
            }
        });
    }
    createMoveBtn() {
        return this.createBtn({
            className: 'slot-button move-slot',
            text: 'Move',
            events: {
                click: () => this.deps.moveSlot()
            }
        });
    }
    createPresetsBtn() {
        return this.createBtn({
            className: 'slot-button slot-presets-button',
            text: 'Presets',
            events: {
                click: () => this.deps.showPresets()
            }
        });
    }
}
