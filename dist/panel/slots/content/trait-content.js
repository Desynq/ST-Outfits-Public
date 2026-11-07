import { OutfitTracker } from "../../../data/tracker.js";
import { SlotTextbox } from "../../../ui/components/slot/slot-textbox.js";
import { SlotValueText } from "../../../ui/components/SlotValueText.js";
import { promptConfigureTraits } from "../../../ui/prompt/configure-traits.js";
import { promptOptions } from "../../../ui/prompt/prompt-options.js";
import { addDoubleTapListener } from "../../../util/element/click-actions.js";
import { el } from "../../../util/ElementHelper.js";
import { OutfitPanelContext } from "../../base/OutfitPanelContext.js";
export class TraitSlotContenter extends OutfitPanelContext {
    constructor(deps) {
        super(deps.panel);
        this.deps = deps;
    }
    render(container, ctx) {
        const editable = ctx.mode === 'normal';
        const registry = OutfitTracker.viewTraitRegistry();
        const root = el('div', {
            className: 'slot-trait-container'
        });
        const list = el('div', {
            className: 'slot-trait-list',
            parent: root
        });
        for (const assignment of ctx.slot.traits) {
            const args = {
                ctx,
                editable,
                registry,
                list,
                assignment
            };
            this.addRow(args);
        }
        if (editable) {
            el('button', {
                className: 'slot-button slot-add-trait',
                text: '+ Add Trait',
                parent: root,
                events: {
                    click: () => this.addTrait(ctx)
                }
            });
        }
        container.append(root);
    }
    get expandedTraits() {
        return this.panel.expandedTraits;
    }
    addRow(args) {
        const { ctx, editable, registry, list, assignment } = args;
        const definition = registry.get(assignment.traitId);
        // Dangling references are valid, but not displayed.
        if (!definition)
            return;
        const row = el('div', {
            className: 'slot-trait-row',
            parent: list
        });
        const main = el('div', {
            className: 'slot-trait-main',
            parent: row
        });
        const triggerEl = el('div', {
            className: 'slot-trait-trigger',
            parent: main
        });
        const iconEl = el('i', {
            className: definition.icon?.type === 'font-awesome'
                ? definition.icon.className
                : 'fa-solid fa-tag',
            parent: triggerEl
        });
        let spin = null;
        iconEl.addEventListener('click', event => {
            event.stopPropagation();
            if (spin?.playState === 'running') {
                spin.reverse();
                return;
            }
            spin = iconEl.animate([
                { transform: 'rotate(0deg)' },
                { transform: 'rotate(360deg)' }
            ], {
                duration: 500,
                easing: 'ease-in-out'
            });
        });
        const traitNameDiv = el('div', {
            className: 'slot-trait-name',
            classes: [
                assignment.addendum?.trim() ? '--has-addendum' : ''
            ],
            text: definition.name,
            title: [
                definition.description,
                assignment.addendum?.trim()
            ].filter(Boolean).join('\n\n'),
            parent: triggerEl
        });
        const spacerDiv = el('div', {
            className: 'slot-trait-spacer',
            parent: triggerEl
        });
        const content = el('div', {
            className: 'slot-trait-content',
            parent: row
        });
        const traitKey = `${ctx.slot.id}:${assignment.traitId}`;
        const initiallyExpanded = this.expandedTraits.has(traitKey);
        content.hidden = !initiallyExpanded;
        row.classList.toggle('--expanded', initiallyExpanded);
        const expandButton = el('button', {
            className: 'slot-button slot-trait-expand',
            title: 'Expand trait',
            parent: main,
            events: {
                click: () => {
                    const expanded = !this.expandedTraits.has(traitKey);
                    if (expanded) {
                        this.expandedTraits.add(traitKey);
                    }
                    else {
                        this.expandedTraits.delete(traitKey);
                    }
                    content.hidden = !expanded;
                    row.classList.toggle('--expanded', expanded);
                    expandButton.title = expanded
                        ? 'Collapse trait'
                        : 'Expand trait';
                    expandButton.setAttribute('aria-expanded', String(expanded));
                }
            }
        });
        triggerEl.addEventListener('click', () => {
            if (window.getSelection()?.toString()) {
                return;
            }
            expandButton.click();
        });
        expandButton.setAttribute('aria-expanded', String(initiallyExpanded));
        expandButton.title = initiallyExpanded
            ? 'Collapse trait'
            : 'Expand trait';
        el('i', {
            className: 'fa-solid fa-chevron-down',
            parent: expandButton
        });
        const traitDescDiv = el('div', {
            className: 'slot-trait-description',
            text: definition.description,
            parent: content
        });
        if (editable) {
            addDoubleTapListener(traitDescDiv, async () => {
                await promptConfigureTraits({
                    onSave: () => this.panel.applyTraitChanges()
                });
            });
        }
        const editActions = el('div', {
            className: 'slot-trait-edit-actions'
        });
        const actionsLeftEl = el('div', {
            className: 'slot-trait-edit-actions-left',
            parent: editActions
        });
        const actionsRightEl = el('div', {
            className: 'slot-trait-edit-actions-right',
            parent: editActions
        });
        editActions.hidden = true;
        const addendumArgs = {
            ...args,
            parent: content,
            editActions,
            actionsLeftEl,
            actionsRightEl
        };
        const { textbox } = this.addAddendumEl(addendumArgs);
        if (!editable)
            return;
        const controls = el('div', {
            className: 'slot-trait-controls',
            parent: main
        });
        main.insertBefore(controls, expandButton);
        el('button', {
            className: 'slot-button',
            text: '✎',
            title: 'Edit addendum',
            parent: controls,
            events: {
                click: () => textbox.beginInlineEdit()
            }
        });
        el('button', {
            className: 'slot-button',
            text: '×',
            title: 'Remove trait',
            parent: controls,
            events: {
                click: () => this.removeTrait(ctx, assignment.traitId)
            }
        });
        content.append(editActions);
    }
    addAddendumEl(args) {
        const { parent, assignment, ctx, editable, editActions, actionsLeftEl, actionsRightEl } = args;
        const addendumEl = el('div', {
            className: 'slot-trait-addendum slot-textbox',
            classes: [
                !assignment.addendum?.trim() ? 'none' : ''
            ],
            parent
        });
        const valueRenderer = new SlotValueText({
            showPromptModal: async () => { }, // TODO: Implement
            expandValue: () => {
                addendumEl.classList.add('--reveal');
            }
        });
        addendumEl.replaceChildren(valueRenderer.createFrag(assignment.addendum || (editable ? 'Add addendum' : ''), ctx.slot.kind));
        const textbox = new SlotTextbox(parent, addendumEl, {
            ctx,
            editCoordinator: this.deps.editCoordinator,
            removeActionButtons: () => {
                actionsLeftEl.replaceChildren();
                actionsRightEl.replaceChildren();
                editActions.hidden = false;
            },
            actionsLeftEl,
            actionsRightEl,
            getOriginalText: () => assignment.addendum ?? '',
            getEmptyText: () => '',
            isEmpty: () => !assignment.addendum?.trim(),
            getEditBoxClassName: () => 'slot-editbox',
            onCommit: text => {
                this.updateAddendum(ctx, assignment, text);
            },
            onCancel: () => {
                this.panel.renderTabsAndActiveContent();
            }
        });
        if (editable) {
            addDoubleTapListener(addendumEl, () => {
                textbox.beginInlineEdit();
            });
        }
        return { textbox };
    }
    async addTrait(ctx) {
        const registry = OutfitTracker.viewTraitRegistry();
        const assigned = new Set(ctx.slot.traits.map(trait => trait.traitId));
        const available = registry.getAll()
            .filter(trait => !assigned.has(trait.id));
        const configureOption = '⚙ Configure Traits';
        const options = [
            ...available.map(trait => trait.name),
            configureOption
        ];
        const selected = await promptOptions('Add which trait?', options);
        if (!selected)
            return;
        if (selected === configureOption) {
            const changedTraits = await promptConfigureTraits({
                onSave: () => this.panel.applyTraitChanges()
            });
            if (changedTraits) {
                return this.addTrait(ctx);
            }
            return;
        }
        const index = options.indexOf(selected);
        if (index < 0 || index >= available.length)
            return;
        const traitId = available[index].id;
        this.commit(ctx, [
            ...ctx.slot.traits.map(trait => ({ ...trait })),
            { traitId }
        ]);
    }
    updateAddendum(ctx, assignment, value) {
        const addendum = value.trim();
        const traits = ctx.slot.traits.map(trait => {
            if (trait.traitId !== assignment.traitId) {
                return { ...trait };
            }
            return {
                traitId: trait.traitId,
                ...(addendum && { addendum })
            };
        });
        this.commit(ctx, traits);
    }
    removeTrait(ctx, traitId) {
        const assignment = ctx.slot.traits.find(trait => trait.traitId === traitId);
        if (assignment?.addendum?.trim()) {
            const confirmed = confirm('This trait has an addendum. Remove it anyway?');
            if (!confirmed)
                return;
        }
        this.commit(ctx, ctx.slot.traits
            .filter(trait => trait.traitId !== traitId)
            .map(trait => ({ ...trait })));
    }
    commit(ctx, traits) {
        this.outfitView.setTraits(ctx.slot.id, traits);
        this.outfitManager.updateSlotContext(ctx.slot.id);
        this.panel.saveAndRender();
    }
}
