import { SlotKind } from "../data/model/Outfit.js";
import { OverflowMenuFactory } from "../ui/components/OverflowMenu.js";
import { confirmChanges } from "../ui/prompt/prompt-options.js";
import { setScroll } from "../util/element/scroll.js";
import { el } from "../util/ElementHelper.js";
import { plural } from "../util/StringHelper.js";
import { OutfitPanelContext } from "./base/OutfitPanelContext.js";
import { DisplaySlot } from "./slots/DisplaySlot.js";
import { EditCoordinator } from "./slots/edit-coordinator.js";
import { SlotImageElementFactory } from "./slots/SlotImageController.js";
import { SlotRenderer } from "./slots/SlotRenderer.js";

function updateBottomPadding(
	container: HTMLElement,
	child: HTMLElement,
	topOffset: number,
	below: readonly HTMLElement[] = []
): void {
	const belowHeight = below.reduce(
		(sum, element) => sum + element.offsetHeight,
		0
	);

	const padding = Math.max(
		0,
		container.clientHeight - child.offsetHeight - belowHeight - topOffset
	);

	container.style.paddingBottom = `${padding}px`;
}

export class SlotsRenderer extends OutfitPanelContext {

	private readonly scrollPositions = new Map<SlotKind, number>();
	private currentKind?: SlotKind;

	public renderSlots(
		kind: SlotKind,
		slots: readonly string[],
		slotContainer: HTMLDivElement
	): void {
		// Always store current scroll before replacing
		if (this.currentKind !== undefined) {
			this.scrollPositions.set(this.currentKind, slotContainer.scrollTop);
		}

		this.currentKind = kind;

		const displaySlots = this.buildDisplaySlots(slots);

		const imageFactory = new SlotImageElementFactory(
			this.panel,
			slotContainer.getBoundingClientRect().width
		);

		const overflowMenuFactory = new OverflowMenuFactory();

		const editCoordinator = new EditCoordinator();

		const slotFactory = new SlotRenderer({
			panel: this.panel,
			displaySlots,
			imageFactory,
			overflowMenuFactory,
			editCoordinator
		});

		const fragment = document.createDocumentFragment();

		let lastSlotEl: HTMLElement | null = null;
		for (let i = 0; i < displaySlots.length; i++) {
			const display = displaySlots[i];
			const slotEl = slotFactory.createSlotElement(slotContainer, display);

			if (i === displaySlots.length - 1) {
				lastSlotEl = slotEl;
			}

			fragment.append(slotEl);
		}

		const footerButtons = [
			this.createAddSlotButton(kind),
			this.createBatchReplaceButton()
		];
		fragment.append(...footerButtons);

		slotContainer.replaceChildren(fragment);
		if (lastSlotEl) {
			updateBottomPadding(
				slotContainer,
				lastSlotEl,
				16,
				footerButtons
			);
		}

		setScroll(slotContainer, this.scrollPositions.get(kind) ?? 0);
	}

	private buildDisplaySlots(slots: readonly string[]): DisplaySlot[] {
		const resolvedSlots = this.outfitView.resolve(slots);
		const displaySlots: DisplaySlot[] = [];

		let displayIndex = 1;
		for (const slot of resolvedSlots) {
			if (!slot.resolved) {
				console.warn(`Slot ${slot.id} failed to resolve`);
				continue;
			}

			const slotIndex = this.outfitView.getIndexById(slot.id)!;

			const displaySlot = new DisplaySlot(displayIndex, slotIndex, slot);
			displaySlots.push(displaySlot);

			displayIndex++;
		}

		return displaySlots;
	}

	private createAddSlotButton(kind: SlotKind): HTMLButtonElement {
		const addSlotButton = document.createElement('button');
		addSlotButton.className = 'add-slot-button';
		addSlotButton.textContent = 'Add Slot';

		addSlotButton.addEventListener('click', () => this.promptAddSlot(kind));
		return addSlotButton;
	}

	private promptAddSlot(kind: SlotKind): void {
		const id = prompt('Name?')?.trim();
		if (!id) {
			this.panel.renderTabsAndActiveContent();
			return;
		}

		const duplicate = !this.outfitView.addSlot(id, kind);
		if (duplicate) {
			this.panel.sendSystemMessage(`Slot with id ${id} already exists.`);
			return;
		}

		void this.outfitManager.updateSlotContext(id);
		this.panel.saveAndRender();
	}

	private createBatchReplaceButton(): HTMLButtonElement {
		return el('button', {
			className: 'add-slot-button',
			text: 'Find and Replace',
			events: {
				click: () => this.promptFindAndReplace()
			}
		});
	}

	private async promptFindAndReplace(): Promise<void> {
		const searchValue = prompt('Find?');
		if (!searchValue) {
			return;
		}

		const replaceValue = prompt('Replace with');
		if (replaceValue === null) {
			return;
		}

		const slots = this.outfitView.slots;
		const changes: { id: string; old: string; new: string; }[] = [];
		for (const slot of slots) {
			const nextValue = slot.value.replaceAll(searchValue, replaceValue);

			if (nextValue !== slot.value) {
				changes.push({
					id: slot.id,
					old: slot.value,
					new: nextValue
				});
			}
		}

		if (changes.length === 0) {
			toastr.info(`No matches found for '${searchValue}'.`);
			return;
		}

		const preview = changes
			.map(change =>
				`${change.id}\n` +
				`- ${change.old}\n` +
				`+ ${change.new}`
			)
			.join('\n\n');

		const ok = await confirmChanges(
			`Replace '${searchValue}' with '${replaceValue}' in ${changes.length} slot${plural(changes.length)}?`,
			changes.map(change => [change.old, change.new]),
			{
				confirmText: 'Replace',
				cancelText: 'Cancel'
			}
		);

		if (!ok) return;

		for (const change of changes) {
			this.outfitView.setValue(change.id, change.new);
			this.outfitManager.updateSlotContext(change.id, { debounceMacros: true });
		}

		toastr.info(
			`Replaced '${searchValue}' with '${replaceValue}' in ${changes.length} slot${plural(changes.length)}.`
		);

		this.panel.saveAndRender();
	}
}