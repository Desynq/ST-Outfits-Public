import { el } from "../../../util/ElementHelper.js";
import { TraitSlotContenter } from "../content/trait-content.js";
import { SlotActionsElement } from "../SlotActionsElement.js";
import { BaseSlotRenderer } from "./base-slot.js";
export class TraitSlotRenderer extends BaseSlotRenderer {
    constructor(deps) {
        super(deps);
        this.contenter = new TraitSlotContenter({
            panel: this.panel,
            editCoordinator: deps.editCoordinator
        });
    }
    createSlotElement(container, display) {
        const element = super.createSlotElement(container, display);
        element.classList.add('slot-trait');
        return element;
    }
    renderContent(ctx, _imageElement) {
        this.contenter.render(ctx.contentTextEl, ctx);
        ctx.contentTextEl.hidden = !this.panel.expandedTraitLists.has(ctx.slot.id);
    }
    decorateMinimal(ctx) {
        ctx.labelRightDiv.append(this.createToggleBtn(ctx.slot));
        if (ctx.slot.isEmpty()) {
            ctx.labelDiv.classList.add('minimized');
        }
        this.createMenuBtn(ctx).appendTo(ctx.labelRightDiv);
    }
    decorate(ctx, _imageElement) {
        const expandButton = this.createExpandButton(ctx);
        ctx.labelLeftDiv.addEventListener('click', (event) => {
            if (event.target !== ctx.labelLeftDiv) {
                return;
            }
            expandButton.click();
        });
        ctx.labelRightDiv.append(expandButton);
        const actions = new SlotActionsElement(this.panel);
        ctx.actionsLeftEl.append(this.createToggleBtn(ctx.slot));
        if (ctx.slot.enabled) {
            ctx.actionsLeftEl.append(actions.createUnequipButton(ctx.slot));
        }
        this.createMenuBtn(ctx).appendTo(ctx.actionsRightEl);
    }
    createMenuBtn(ctx) {
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
            getViewBoundary: () => ctx.scroller.getBoundingClientRect()
        });
        const actions = [
            {
                className: 'delete-slot',
                text: 'Delete',
                run: () => this.askDeleteSlot(ctx.slotElement, ctx.slot)
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
    createExpandButton(ctx) {
        const slotId = ctx.slot.id;
        const expanded = this.panel.expandedTraitLists.has(slotId);
        const button = el('button', {
            className: 'slot-button slot-trait-list-toggle',
            title: expanded ? 'Collapse traits' : 'Expand traits',
            children: [
                el('i', {
                    className: 'fa-solid fa-chevron-down'
                })
            ]
        });
        button.classList.toggle('--expanded', expanded);
        button.setAttribute('aria-expanded', String(expanded));
        button.addEventListener('click', () => {
            const expanded = !this.panel.expandedTraitLists.has(slotId);
            if (expanded) {
                this.panel.expandedTraitLists.add(slotId);
            }
            else {
                this.panel.expandedTraitLists.delete(slotId);
            }
            ctx.contentTextEl.hidden = !expanded;
            button.classList.toggle('--expanded', expanded);
            button.setAttribute('aria-expanded', String(expanded));
            button.title = expanded ? 'Collapse traits' : 'Expand traits';
        });
        return button;
    }
}
