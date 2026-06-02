import { OutfitSlotState } from "../../data/model/OutfitSnapshots.js";
import { OutfitManager } from "../../manager/OutfitManager.js";
import { div } from "../../util/element/divs.js";


type SlotModalConstructor<T extends SlotModal> = {
	new(
		slot: OutfitSlotState,
		manager: OutfitManager,
		saveAndRender: () => void,
		close: () => void
	): T;

	show(
		slot: OutfitSlotState,
		manager: OutfitManager,
		saveAndRender: () => void
	): void;
};

export abstract class SlotModal {

	protected root: HTMLDivElement;

	public constructor(
		protected readonly slot: OutfitSlotState,
		protected readonly manager: OutfitManager,
		protected readonly saveAndRender: () => void,
		protected readonly close: () => void
	) {
		this.root = this.createRoot();
		this.construct();
	}


	protected createRoot(): HTMLDivElement {
		return div('slot-presets-modal');
	}

	protected abstract construct(): void;

	protected isCloseOnBlur(): boolean {
		return true;
	}

	public static show<T extends SlotModal>(
		this: SlotModalConstructor<T>,
		slot: OutfitSlotState,
		manager: OutfitManager,
		saveAndRender: () => void
	): void {
		const overlay = div('slot-presets-overlay');

		const ModalClass = this as new (
			slot: OutfitSlotState,
			manager: OutfitManager,
			saveAndRender: () => void,
			close: () => void
		) => T;

		const modal = new ModalClass(slot, manager, saveAndRender, () => {
			overlay.remove();
		});

		overlay.append(modal.root);
		document.body.append(overlay);

		if (modal.isCloseOnBlur()) {
			overlay.addEventListener('click', (e) => {
				if (e.target === overlay) {
					overlay.remove();
				}
			});
		}
	}

	public reshow(): void {
		this.close();

		const ModalClass = this.constructor as SlotModalConstructor<this>;

		ModalClass.show(this.slot, this.manager, this.saveAndRender);
	}
}