import { OutfitSlotState } from "../../data/model/OutfitSnapshots.js";
import { el } from "../../util/ElementHelper.js";
import { OutfitPanelContext } from "../base/OutfitPanelContext.js";




export class SlotActionsElement extends OutfitPanelContext {

	public createUnequipButton(slot: OutfitSlotState): HTMLButtonElement {
		const text = slot.equipped ? 'Unequip' : 'Equip';

		const click = (): void => {
			this.outfitView.setEquipped(slot.id, !slot.equipped);
			void this.outfitManager.updateSlotContext(slot.id);
			this.panel.saveAndRender();
		};

		return el('button', {
			className: 'slot-button unequip-button',
			classes: [
				slot.equipped ? '--unequip' : '--equip'
			],
			text,
			events: {
				click
			}
		});
	}
}