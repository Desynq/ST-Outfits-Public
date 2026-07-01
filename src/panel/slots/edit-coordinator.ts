import { SlotTextboxFactory } from "./SlotValueController.js";


export class EditCoordinator<T extends object = object> {
	private active: T | null = null;

	public beginEdit(controller: T): void {
		this.active = controller;
	}

	public canEdit(controller: T): boolean {
		return this.active === null || this.active === controller;
	}
}