import { OutfitTracker } from "../../../data/tracker.js";
import { SlotTextbox } from "../../../ui/components/slot/slot-textbox.js";
import { SlotValueText } from "../../../ui/components/SlotValueText.js";
import { promptAddTrait } from "../../../ui/prompt/add-trait.js";
import { promptConfigureTraits } from "../../../ui/prompt/configure-traits.js";
import { addDoubleTapListener } from "../../../util/element/click-actions.js";
import { el } from "../../../util/ElementHelper.js";
import { OutfitPanelContext } from "../../base/OutfitPanelContext.js";
export class TraitSlotContenter extends OutfitPanelContext {
    constructor(deps) {
        super(deps.panel);
        this.deps = deps;
    }
    render(container, ctx) {
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
                registry,
                list,
                assignment
            };
            this.addRow(args);
        }
        el('button', {
            className: 'slot-button slot-add-trait',
            text: '+ Add Trait',
            parent: root,
            events: {
                click: () => this.addTrait(ctx)
            }
        });
        container.append(root);
    }
    get expandedTraits() {
        return this.panel.expandedTraits;
    }
    addRow(args) {
        const { ctx, registry, list, assignment } = args;
        const trait = registry.get(assignment.traitId);
        // Dangling references are valid, but not displayed.
        if (!trait) {
            return;
        }
        const row = el('div', {
            className: 'slot-trait-row',
            classes: [
                assignment.contextualizeInline ? '--inline' : ''
            ],
            parent: list
        });
        const header = el('div', {
            className: 'slot-trait-header',
            parent: row
        });
        const triggerEl = el('div', {
            className: 'slot-trait-trigger',
            parent: header
        });
        const iconEl = el('i', {
            className: trait.icon?.type === 'font-awesome'
                ? trait.icon.className
                : 'fa-solid fa-tag',
            parent: triggerEl
        });
        if (trait.icon?.type === 'font-awesome') {
            iconEl.style.color = trait.icon.color ?? '';
        }
        const traitNameDiv = el('div', {
            className: 'slot-trait-name',
            classes: [
                assignment.addendum?.trim() ? '--has-addendum' : ''
            ],
            text: trait.name,
            title: [
                trait.description,
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
            parent: header,
            children: [
                el('i', {
                    className: 'fa-solid fa-chevron-down',
                })
            ]
        });
        expandButton.setAttribute('aria-expanded', String(initiallyExpanded));
        expandButton.title = initiallyExpanded
            ? 'Collapse trait'
            : 'Expand trait';
        const traitDescDiv = el('div', {
            className: 'slot-trait-description',
            text: trait.description,
            parent: content
        });
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
        const inlineLabel = el('label', {
            className: 'slot-trait-inline',
            title: 'Include this trait inline with the slot content',
            parent: content
        });
        const inlineCheckbox = el('input', {
            type: 'checkbox',
            parent: inlineLabel
        });
        inlineCheckbox.checked = assignment.contextualizeInline;
        el('span', {
            text: 'Contextualize inline',
            parent: inlineLabel
        });
        inlineCheckbox.addEventListener('change', () => {
            this.updateContextualizeInline(ctx, assignment, inlineCheckbox.checked);
        });
        const controls = el('div', {
            className: 'slot-trait-controls',
            parent: header
        });
        header.insertBefore(controls, expandButton);
        const editAddendumBtn = el('button', {
            className: 'slot-button',
            text: '✎',
            title: 'Edit addendum',
            parent: controls,
        });
        const removeTraitBtn = el('button', {
            className: 'slot-button',
            text: '×',
            title: 'Remove trait',
            parent: controls
        });
        /* --------------------------------- Events --------------------------------- */
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
        triggerEl.addEventListener('click', () => {
            if (window.getSelection()?.toString()) {
                return;
            }
            expandButton.click();
        });
        expandButton.addEventListener('click', () => {
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
        });
        addDoubleTapListener(traitDescDiv, async () => {
            await promptConfigureTraits({
                onSave: () => this.panel.applyTraitChanges()
            });
        });
        editAddendumBtn.addEventListener('click', () => {
            textbox.beginInlineEdit();
        });
        removeTraitBtn.addEventListener('click', () => {
            this.removeTrait(ctx, assignment.traitId);
        });
        content.append(editActions);
    }
    addAddendumEl(args) {
        const { parent, assignment, ctx, editActions, actionsLeftEl, actionsRightEl } = args;
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
        addendumEl.replaceChildren(valueRenderer.createFrag(assignment.addendum || 'Add addendum', ctx.slot.kind));
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
        addDoubleTapListener(addendumEl, () => {
            textbox.beginInlineEdit();
        });
        return { textbox };
    }
    async addTrait(ctx) {
        const traitId = await promptAddTrait({
            excludedIds: new Set(ctx.slot.traits.map(assignment => assignment.traitId)),
            onConfigure: () => promptConfigureTraits({
                onSave: () => this.panel.applyTraitChanges()
            })
        });
        if (!traitId) {
            return;
        }
        const trait = OutfitTracker.viewTraitRegistry().get(traitId);
        this.commit(ctx, [
            ...ctx.slot.traits.map(assignment => ({ ...assignment })),
            {
                traitId,
                addendum: null,
                contextualizeInline: trait?.contextInline === true
            }
        ]);
    }
    updateAddendum(ctx, assignment, value) {
        const addendum = value.trim();
        const traits = ctx.slot.traits.map(trait => {
            if (trait.traitId !== assignment.traitId) {
                return trait;
            }
            return {
                ...trait,
                addendum: addendum || null,
            };
        });
        this.commit(ctx, traits);
    }
    updateContextualizeInline(ctx, assignment, value) {
        const traits = ctx.slot.traits.map(trait => {
            if (trait.traitId !== assignment.traitId) {
                return trait;
            }
            return {
                ...trait,
                contextualizeInline: value
            };
        });
        this.commit(ctx, traits);
    }
    removeTrait(ctx, traitId) {
        const assignment = ctx.slot.traits.find(trait => trait.traitId === traitId);
        if (assignment?.addendum?.trim()) {
            const confirmed = confirm('This trait has an addendum. Remove it anyway?');
            if (!confirmed) {
                return;
            }
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
