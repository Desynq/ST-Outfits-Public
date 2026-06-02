import { SlotKind } from "../data/model/Outfit.js";
import { OverflowMenuFactory } from "../ui/components/OverflowMenu.js";
import { setScroll } from "../util/element/scroll.js";
import { OutfitPanelContext } from "./base/OutfitPanelContext.js";
import { DisplaySlot } from "./slots/DisplaySlot.js";
import { EditCoordinator } from "./slots/edit-coordinator.js";
import { SlotImageElementFactory } from "./slots/SlotImageController.js";
import { SlotRenderer } from "./slots/SlotRenderer.js";

function updateBottomPadding(
	container: HTMLElement,
	child: HTMLElement,
	topOffset = 48
): void {
	const padding = Math.max(0, container.clientHeight - child.offsetHeight - topOffset);
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

		const addSlotBtn = this.createAddSlotButton(kind);
		fragment.append(addSlotBtn);

		slotContainer.replaceChildren(fragment);
		if (lastSlotEl) {
			this.observeLastSlot(slotContainer, lastSlotEl);
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

	private observeLastSlot(slotContainer: HTMLElement, slotEl: HTMLElement): void {
		updateBottomPadding(slotContainer, slotEl);
	}

	private createAddSlotButton(kind: SlotKind): HTMLButtonElement {
		const addSlotButton = document.createElement('button');
		addSlotButton.className = 'add-slot-button';
		addSlotButton.textContent = 'Add Slot';

		addSlotButton.addEventListener('click', () => this.addSlot(kind));
		return addSlotButton;
	}

	private addSlot(kind: SlotKind): void {
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
}