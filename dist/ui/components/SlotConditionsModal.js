import { div } from "../../util/element/divs.js";
import { el } from "../../util/ElementHelper.js";
import { isValidSlotId } from "../../util/normalize/slot.js";
import { SlotModal } from "./Modal.js";
function parse(str) {
    return str
        .split(',')
        .map(it => it.trim())
        .filter(id => isValidSlotId(id))
        .map(id => ({
        type: 'active',
        id
    }));
}
export class SlotConditionsModal extends SlotModal {
    isCloseOnBlur() {
        return false;
    }
    construct() {
        const content = div('slot-conditions-content', this.root);
        const input = el('textarea', {
            className: 'slot-conditions-input',
            value: this.getInitialValue(),
            parent: content
        });
        input.placeholder = 'slot-id, another-slot, master-slot';
        const dropdown = div('slot-conditions-dropdown', content);
        const renderDropdown = () => {
            dropdown.replaceChildren();
            const outfitView = this.manager.getOutfitView();
            const usedIds = new Set(parse(input.value).map(condition => condition.id));
            const kinds = outfitView.getSlotKinds();
            for (const kind of kinds) {
                const ids = outfitView
                    .getSlotsFromKind(kind)
                    .map(slot => slot.id)
                    .filter(id => id !== this.slot.id)
                    .filter(id => !usedIds.has(id));
                if (ids.length === 0) {
                    continue;
                }
                const group = div('slot-conditions-dropdown-kind', dropdown);
                el('div', {
                    className: 'slot-conditions-dropdown-kind-title',
                    text: kind,
                    parent: group
                });
                const list = div('slot-conditions-dropdown-kind-list', group);
                for (const id of ids) {
                    el('button', {
                        className: 'slot-conditions-dropdown-item',
                        text: id,
                        events: {
                            click: () => {
                                this.addConditionId(input, id);
                                renderDropdown();
                                input.focus();
                            }
                        },
                        parent: list
                    });
                }
            }
        };
        input.addEventListener('input', renderDropdown);
        renderDropdown();
        const footer = div('footer', this.root);
        const footerLeft = div('footer-left', footer);
        const footerRight = div('footer-right', footer);
        el('button', {
            className: 'slot-preset-btn slot-conditions-save-btn',
            text: 'Save',
            events: {
                click: () => this.save(input.value)
            },
            parent: footerLeft
        });
        el('button', {
            className: 'slot-preset-btn close-button',
            text: 'X',
            events: {
                click: () => this.close()
            },
            parent: footerRight
        });
    }
    addConditionId(input, id) {
        const current = parse(input.value).map(condition => condition.id);
        if (current.includes(id)) {
            return;
        }
        current.push(id);
        input.value = current.join(', ');
        input.dispatchEvent(new Event('input'));
    }
    getInitialValue() {
        const conditions = this.slot.conditions;
        if (conditions.mode === 'none') {
            return '';
        }
        return conditions.items
            .map(condition => condition.id)
            .join(', ');
    }
    save(raw) {
        const conditions = parse(raw);
        const mutator = this.manager.getOutfitView().manipulate();
        if (conditions.length === 0) {
            mutator.setConditions(this.slot.id, 'none', []);
        }
        else {
            mutator.setConditions(this.slot.id, 'and_all', conditions);
        }
        this.close();
        this.saveAndRender();
    }
}
