import { ContextSlotState } from "../../data/model/OutfitSnapshots.js";
import { OutfitManager } from "../../manager/OutfitManager.js";
import { div } from "../../util/element/divs.js";

export interface SlotModalContext<
	T extends ContextSlotState = ContextSlotState
> {
	slot: T;
	manager: OutfitManager;
	updateContext: () => void;
	saveAndRender: () => void;
	close: () => void;
}

type SlotModalConstructor<T extends ContextSlotState> = {
	new(context: SlotModalContext<T>): SlotModal<T>;
};

export abstract class SlotModal<
	T extends ContextSlotState = ContextSlotState
> {
	protected readonly slot: T;
	protected readonly manager: OutfitManager;
	protected readonly updateContext: () => void;
	protected readonly saveAndRender: () => void;
	protected readonly close: () => void;

	protected root: HTMLDivElement;

	public constructor(context: SlotModalContext<T>) {
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

	public static show<T extends ContextSlotState>(
		this: SlotModalConstructor<T>,
		slot: T,
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

		const ModalClass = this.constructor as SlotModalConstructor<T>
			& typeof SlotModal;

		ModalClass.show(
			this.slot,
			this.manager,
			this.updateContext,
			this.saveAndRender
		);
	}
}