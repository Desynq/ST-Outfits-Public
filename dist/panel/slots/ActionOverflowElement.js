import { el } from "../../util/ElementHelper.js";
import { conditionalList } from "../../util/list-utils.js";
export class SlotActionsMenuElement {
    constructor(deps, factory) {
        this.deps = deps;
        this.factory = factory;
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
    appendTo(parent) {
        parent.append(this.btn);
        return this;
    }
    closeMenu() {
        this.menu.closeMenu();
    }
    onOpen(listener) {
        this.menu.onOpen(listener);
        return this;
    }
    onClose(listener) {
        this.menu.onClose(listener);
        return this;
    }
    onClopen(listener) {
        this.menu.onClopen(listener);
        return this;
    }
    buildMenuChildren() {
        return conditionalList(this.createDeleteBtn(), this.createShiftBtn(), this.createMoveBtn(), this.createPresetsBtn(), this.createConditionsBtn(), [this.deps.canAddNote(), () => this.createAddNoteBtn()]);
    }
    createBtn(options) {
        const { events, ...rest } = options;
        return el('button', {
            ...rest,
            events: {
                ...events,
                click: (e) => {
                    const btn = e.currentTarget;
                    this.menu.closeMenu();
                    events?.click?.call(btn, e);
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
    createConditionsBtn() {
        return this.createBtn({
            className: 'slot-button slot-conditions-button',
            text: 'Conditions',
            events: {
                click: () => this.deps.showConditions()
            }
        });
    }
    createAddNoteBtn() {
        return this.createBtn({
            className: 'slot-button slot-add-addendum-button',
            text: 'Add Note',
            events: {
                click: () => this.deps.addNote()
            }
        });
    }
}
