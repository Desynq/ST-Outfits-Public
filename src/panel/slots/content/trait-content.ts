import { TraitAssignment } from "../../../data/model/Outfit.js";
import { OutfitTracker } from "../../../data/tracker.js";
import { TraitRegistryView } from "../../../data/view/TraitRegistryView.js";
import { PanelType } from "../../../types/maps.js";
import { SlotTextbox } from "../../../ui/components/slot/slot-textbox.js";
import { SlotValueText } from "../../../ui/components/SlotValueText.js";
import { promptConfigureTraits } from "../../../ui/prompt/configure-traits.js";
import { promptOptions } from "../../../ui/prompt/prompt-options.js";
import { addDoubleTapListener } from "../../../util/element/click-actions.js";
import { el } from "../../../util/ElementHelper.js";
import { withValue } from "../../../util/logic.js";
import { OutfitPanelContext } from "../../base/OutfitPanelContext.js";
import { OutfitPanel } from "../../OutfitPanel.js";
import { EditCoordinator } from "../edit-coordinator.js";
import { TraitSlotContext } from "../renderer/trait-slot.js";

export interface TraitSlotContenterDeps {
	panel: OutfitPanel<PanelType>;
	editCoordinator: EditCoordinator;
}

export class TraitSlotContenter extends OutfitPanelContext {
	public constructor(
		private readonly deps: TraitSlotContenterDeps
	) {
		super(deps.panel);
	}

	public render(
		container: HTMLDivElement,
		ctx: TraitSlotContext
	): void {
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
			const definition = registry.get(assignment.traitId);

			// Dangling references are valid, but not displayed.
			if (!definition) continue;

			const row = el('div', {
				className: 'slot-trait-row',
				parent: list
			});



			const main = el('div', {
				className: 'slot-trait-main',
				parent: row
			});

			const icon = el('i', {
				className: definition.icon?.type === 'font-awesome'
					? definition.icon.className
					: 'fa-solid fa-tag',
				parent: main
			});

			const body = el('div', {
				className: 'slot-trait-body',
				parent: main
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



			el('div', {
				className: 'slot-trait-name',
				text: TraitRegistryView.getDisplayName(definition.id),
				parent: body
			});

			const traitDescDiv = el('div', {
				className: 'slot-trait-description',
				text: definition.description,
				parent: body
			});

			if (editable) {
				addDoubleTapListener(traitDescDiv, async () => {
					await promptConfigureTraits({
						onSave: () => this.panel.applyTraitChanges()
					});
				});
			}

			const { textbox } = this.addAddendumEl({
				parent: body,
				assignment,
				ctx,
				editable,
				editActions,
				actionsLeftEl,
				actionsRightEl
			});

			if (!editable) continue;

			const controls = el('div', {
				className: 'slot-trait-controls',
				parent: main
			});

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

			row.append(editActions);
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

	private addAddendumEl({ parent, assignment, ctx, editable, editActions, actionsLeftEl, actionsRightEl }: {
		parent: HTMLDivElement;
		assignment: Readonly<TraitAssignment>;
		ctx: TraitSlotContext;
		editable: boolean;
		editActions: HTMLDivElement;
		actionsLeftEl: HTMLDivElement;
		actionsRightEl: HTMLDivElement;
	}): { textbox: SlotTextbox; } {
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

		addendumEl.replaceChildren(
			valueRenderer.createFrag(
				assignment.addendum || (editable ? 'Add addendum' : ''),
				ctx.slot.kind
			)
		);

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


	private async addTrait(ctx: TraitSlotContext): Promise<void> {
		const registry = OutfitTracker.viewTraitRegistry();

		const assigned = new Set(
			ctx.slot.traits.map(trait => trait.traitId)
		);

		const available = registry.getAll()
			.filter(trait => !assigned.has(trait.id));

		const configureOption = '⚙ Configure Traits';

		const options = [
			...available.map(trait =>
				TraitRegistryView.getDisplayName(trait.id)
			),
			configureOption
		];

		const selected = await promptOptions(
			'Add which trait?',
			options
		);

		if (!selected) return;

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
		if (index < 0 || index >= available.length) return;

		const traitId = available[index].id;

		this.commit(ctx, [
			...ctx.slot.traits.map(trait => ({ ...trait })),
			{ traitId }
		]);
	}



	private updateAddendum(
		ctx: TraitSlotContext,
		assignment: Readonly<TraitAssignment>,
		value: string
	): void {
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


	private removeTrait(
		ctx: TraitSlotContext,
		traitId: string
	): void {
		const assignment = ctx.slot.traits.find(
			trait => trait.traitId === traitId
		);

		if (assignment?.addendum?.trim()) {
			const confirmed = confirm(
				'This trait has an addendum. Remove it anyway?'
			);

			if (!confirmed) return;
		}

		this.commit(
			ctx,
			ctx.slot.traits
				.filter(trait => trait.traitId !== traitId)
				.map(trait => ({ ...trait }))
		);
	}

	private commit(
		ctx: TraitSlotContext,
		traits: TraitAssignment[]
	): void {
		this.outfitView.setTraits(ctx.slot.id, traits);
		this.outfitManager.updateSlotContext(ctx.slot.id);
		this.panel.saveAndRender();
	}
}
