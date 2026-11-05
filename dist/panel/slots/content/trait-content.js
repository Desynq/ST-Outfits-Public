import { OutfitTracker } from "../../../data/tracker.js";
import { TraitRegistryView } from "../../../data/view/TraitRegistryView.js";
import { promptOptions } from "../../../ui/prompt/prompt-options.js";
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
            const definition = registry.get(assignment.traitId);
            // Dangling references are valid, but not displayed.
            if (!definition)
                continue;
            const row = el('div', {
                className: 'slot-trait-row',
                parent: list
            });
            const icon = el('i', {
                className: definition.icon?.type === 'font-awesome'
                    ? definition.icon.className
                    : 'fa-solid fa-tag',
                parent: row
            });
            const body = el('div', {
                className: 'slot-trait-body',
                parent: row
            });
            el('div', {
                className: 'slot-trait-name',
                text: TraitRegistryView.getDisplayName(definition.id),
                parent: body
            });
            el('div', {
                className: 'slot-trait-description',
                text: definition.description,
                parent: body
            });
            if (assignment.addendum) {
                el('div', {
                    className: 'slot-trait-addendum',
                    text: assignment.addendum,
                    parent: body
                });
            }
            if (ctx.mode !== 'normal')
                continue;
            const controls = el('div', {
                className: 'slot-trait-controls',
                parent: row
            });
            el('button', {
                className: 'slot-button',
                text: '✎',
                title: 'Edit addendum',
                parent: controls,
                events: {
                    click: () => this.editAddendum(ctx, assignment)
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
        }
        if (ctx.mode === 'normal') {
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
    async addTrait(ctx) {
        const registry = OutfitTracker.viewTraitRegistry();
        const assigned = new Set(ctx.slot.traits.map(trait => trait.traitId));
        const available = registry.getAll()
            .filter(trait => !assigned.has(trait.id));
        if (!available.length) {
            toastr.info('No unassigned traits available.');
            return;
        }
        const options = available.map(trait => TraitRegistryView.getDisplayName(trait.id));
        const selected = await promptOptions('Add which trait?', options);
        if (!selected)
            return;
        const index = options.indexOf(selected);
        if (index < 0)
            return;
        const traitId = available[index].id;
        this.commit(ctx, [
            ...ctx.slot.traits.map(trait => ({ ...trait })),
            { traitId }
        ]);
    }
    editAddendum(ctx, assignment) {
        const value = prompt('Trait addendum (leave empty to clear):', assignment.addendum ?? '');
        if (value === null)
            return;
        const addendum = value.trim();
        const traits = ctx.slot.traits.map(trait => {
            if (trait.traitId !== assignment.traitId) {
                return { ...trait };
            }
            const updated = {
                traitId: trait.traitId
            };
            if (addendum)
                updated.addendum = addendum;
            return updated;
        });
        this.commit(ctx, traits);
    }
    removeTrait(ctx, traitId) {
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
