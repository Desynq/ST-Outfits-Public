import { OutfitSlotState } from "../../data/model/OutfitSnapshots.js";
import { OutfitManager } from "../../manager/OutfitManager.js";
import { div } from "../../util/element/divs.js";


export interface SlotModalContext {
	slot: OutfitSlotState;
	manager: OutfitManager;
	updateContext: () => void;
	saveAndRender: () => void;
	close: () => void;
}

type SlotModalConstructor<T extends SlotModal> = {
	new(context: SlotModalContext): T;

	show(
		slot: OutfitSlotState,
		manager: OutfitManager,
		updateContext: () => void,
		saveAndRender: () => void
	): void;
};

export abstract class SlotModal {

	protected readonly slot: OutfitSlotState;
	protected readonly manager: OutfitManager;
	protected readonly updateContext: () => void;
	protected readonly saveAndRender: () => void;
	protected readonly close: () => void;

	protected root: HTMLDivElement;

	public constructor(context: SlotModalContext) {
		this.slot = context.slot;
		this.manager = context.manager;
		this.updateContext = context.updateContext;
		this.saveAndRender = context.saveAndRender;
		this.close = context.close;

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
		updateContext: () => void,
		saveAndRender: () => void
	): void {
		const overlay = div('slot-presets-overlay');

		const modal = new this({
			slot,
			manager,
			updateContext,
			saveAndRender,
			close: () => overlay.remove()
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

		ModalClass.show(
			this.slot,
			this.manager,
			this.updateContext,
			this.saveAndRender
		);
	}
}