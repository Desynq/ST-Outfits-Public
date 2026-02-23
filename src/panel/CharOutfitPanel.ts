import { OutfitTracker } from "../data/tracker.js";
import { CharOutfitManager } from "../manager/CharOutfitManager.js";
import { el } from "../util/ElementHelper.js";
import { OutfitPanel } from "./OutfitPanel.js";


export class CharOutfitPanel extends OutfitPanel<'char'> {

	private constructor(
		outfitManager: CharOutfitManager
	) {
		super(outfitManager);
		this.isVisible = false;
		this.minimized = false;
		this.panelEl = null;
	}

	public static from(
		character: string,
		saveSettings: Function
	): CharOutfitPanel {
		const manager = new CharOutfitManager(saveSettings, character);
		return new CharOutfitPanel(manager);
	}


	public get character(): string {
		return this.outfitManager.character;
	}

	protected override initializePanel(): boolean {
		if (this.panelEl) return false;

		const outfitHeader = el('div', {
			className: 'outfit-header',
			children: [
				el('h3', {
					text: this.getHeaderTitle()
				})
			]
		});

		const outfitTabs = el('div', {
			className: 'outfit-tabs'
		});

		const outfitContent = el('div', {
			className: 'outfit-content'
		});

		const panel = el('div', {
			className: 'outfit-panel char-outfit-panel',
			children: [
				outfitHeader,
				outfitTabs,
				outfitContent
			]
		});

		document.body.append(panel);
		this.panelEl = panel;

		this.makePanelDraggable();
		this.makeHeaderMinimizable();

		const outfitActions = this.createOutfitActions();
		outfitHeader.append(outfitActions);

		return true;
	}

	public override async exportButtonClickListener(): Promise<void> {
		const presetName = prompt('Name this export:');
		if (!presetName) return;

		const characterName = prompt(
			'Export for which character?\nAdd "_user" to the end to export to a persona.\n' +
			'(Leave blank to export as a global user preset)',
		);

		let message;
		const trimmedPreset = presetName.trim();

		if (!characterName) {
			message = 'Cancelled.';
		}
		else if (characterName.trim() !== '') {
			const trimmedCharacter = characterName.trim();
			message = await this.outfitManager.exportPreset(trimmedPreset, trimmedCharacter);
		}
		else {
			message = await this.outfitManager.exportPresetToUser(trimmedPreset);
		}

		if (message && OutfitTracker.areSystemMessagesEnabled()) {
			this.sendSystemMessage(message);
		}

		this.saveAndRender();
	}

	protected override getHeaderTitle(): string {
		return `${this.character}'s Outfit`;
	}

	public override getPanelType(): 'char' {
		return 'char';
	}

	public override hide(): void {
		super.hide();
		this.panelEl?.remove();
		this.panelEl = null;
	}
}