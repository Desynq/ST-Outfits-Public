import { OverflowMenu, OverflowMenuFactory } from "../../ui/components/OverflowMenu.js";
import { el, ElementOptions } from "../../util/ElementHelper.js";
import { EventBus } from "../../util/EventBus.js";
import { conditionalList } from "../../util/list-utils.js";
import { ResourceCleaner } from "../Disposer.js";




export interface SlotActionMenuDeps {
	mountEl: HTMLElement;
	getViewBoundary: () => DOMRect;
	onDispose: (fn: () => void) => void;
	deleteSlot(): void;
	shiftSlot(): void;
	moveSlot(): void;
	showPresets(): void;
	canAddChatNote(): boolean;
	addChatNote(): void;
	canAddCharacterNote(): boolean;
	addCharacterNote(): void;
	showConditions(): void;
}

export class SlotActionsMenuElement {
	private readonly btn: HTMLButtonElement;
	private readonly menu: OverflowMenu;


	public constructor(
		private readonly deps: SlotActionMenuDeps,
		private readonly factory: OverflowMenuFactory
	) {
		this.btn = el('button', {
			className: 'slot-button slot-overflow-button',
			text: '⋯'
		});

		this.menu = this.factory.create({
			openerEl: this.btn,
			onDispose: this.deps.onDispose,
			align: 'right',
			options: {
				className: 'slot-overflow-menu',
				parent: this.deps.mountEl,
				children: this.buildMenuChildren()
			},
			getViewBoundary: this.deps.getViewBoundary
		});

		this.btn.addEventListener('click', (e) => {
			e.stopPropagation();
			this.menu.toggleMenu();
		});
	}

	public appendTo(parent: HTMLElement): this {
		parent.append(this.btn);
		return this;
	}

	public closeMenu(): void {
		this.menu.closeMenu();
	}

	public onOpen(listener: () => void): this {
		this.menu.onOpen(listener);
		return this;
	}

	public onClose(listener: () => void): this {
		this.menu.onClose(listener);
		return this;
	}

	public onClopen(listener: (open: boolean) => void): this {
		this.menu.onClopen(listener);
		return this;
	}

	private buildMenuChildren(): HTMLElement[] {
		return conditionalList(
			this.createDeleteBtn(),
			this.createShiftBtn(),
			this.createMoveBtn(),
			this.createPresetsBtn(),
			this.createConditionsBtn(),
			[this.deps.canAddChatNote(), () => this.createAddChatNoteBtn()],
			this.conditionBtn({
				condition: this.deps.canAddCharacterNote(),
				className: 'slot-button slot-add-character-note-button',
				text: 'Add 👤 Note',
				onClick: () => this.deps.addCharacterNote()
			})
		);
	}


	private createBtn(options: ElementOptions<'button'>): HTMLButtonElement {
		const { events, ...rest } = options;

		return el('button', {
			...rest,
			events: {
				...events,
				click: (e) => {
					const btn = e.currentTarget as HTMLButtonElement;
					this.menu.closeMenu();
					events?.click?.call(btn, e);
				}
			}
		});
	}

	private conditionBtn(options: {
		condition: boolean,
		className: string,
		text: string,
		onClick: () => void;
	}): [condition: boolean, button: () => HTMLButtonElement] {
		return [options.condition, () => this.createBtn({
			className: options.className,
			text: options.text,
			events: {
				click: options.onClick
			}
		})];
	}

	private createDeleteBtn(): HTMLButtonElement {
		return this.createBtn({
			className: 'slot-button delete-slot',
			text: 'Delete',
			events: {
				click: () => this.deps.deleteSlot()
			}
		});
	}

	private createShiftBtn(): HTMLButtonElement {
		return this.createBtn({
			className: 'slot-button slot-shift',
			text: 'Shift',
			events: {
				click: () => this.deps.shiftSlot()
			}
		});
	}

	private createMoveBtn(): HTMLButtonElement {
		return this.createBtn({
			className: 'slot-button move-slot',
			text: 'Move',
			events: {
				click: () => this.deps.moveSlot()
			}
		});
	}

	private createPresetsBtn(): HTMLButtonElement {
		return this.createBtn({
			className: 'slot-button slot-presets-button',
			text: 'Presets',
			events: {
				click: () => this.deps.showPresets()
			}
		});
	}

	private createConditionsBtn(): HTMLButtonElement {
		return this.createBtn({
			className: 'slot-button slot-conditions-button',
			text: 'Conditions',
			events: {
				click: () => this.deps.showConditions()
			}
		});
	}

	private createAddChatNoteBtn(): HTMLButtonElement {
		return this.createBtn({
			className: 'slot-button slot-add-chat-note-button',
			text: 'Add 💬 Note',
			events: {
				click: () => this.deps.addChatNote()
			}
		});
	}
}