import { OutfitTracker } from '../data/tracker.js';
import { BotPanelSettingsView } from '../data/view/PanelViews.js';
import { BotOutfitManager } from '../manager/BotOutfitManager.js';
import { queryOrThrow } from '../util/ElementHelper.js';
import { EventBus } from '../util/EventBus.js';
import { OutfitPanel } from './OutfitPanel.js';

export class BotOutfitPanel extends OutfitPanel<'bot'> {

	private readonly updateCharBus = new EventBus<() => void>();

	public constructor(
		outfitManager: BotOutfitManager
	) {
		super(outfitManager);
	}

	public get character(): string {
		return this.outfitManager.character;
	}

	protected override initializePanel(): boolean {
		if (this.panelEl) return false;

		const panel = document.createElement('div');
		panel.className = 'outfit-panel bot-outfit-panel';

		/*html*/
		panel.innerHTML = `
			<div class="outfit-header">
				<h3>${this.getHeaderTitle()}</h3>
			</div>
			<div class="outfit-tabs"></div>
			<div class="outfit-content" id="bot-outfit-tab-content"></div>
		`;

		document.body.appendChild(panel);
		this.panelEl = panel;

		this.makePanelDraggable();
		this.makeHeaderMinimizable();

		const outfitHeaderDiv = queryOrThrow(this.panelEl, HTMLDivElement, '.outfit-header');
		const outfitActionsDiv = this.createOutfitActions();

		outfitHeaderDiv.appendChild(outfitActionsDiv);
		return true;
	}

	public override getPanelSettings(): BotPanelSettingsView {
		return OutfitTracker.botPanel();
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

	public override getHeaderTitle(): string {
		return `${this.outfitManager.character}'s Outfit`;
	}

	public updateCharacter(name: string, domOnly: boolean = false): void {
		if (!domOnly) {
			this.outfitManager.setCharacter(name);
		}

		if (this.panelEl && !this.minimized) {
			const header = this.panelEl.querySelector('.outfit-header h3');
			if (header) header.textContent = `${name}'s Outfit`;
		}
		this.renderTabsAndActiveContent();

		this.updateCharBus.emit();
	}

	public override getPanelType(): 'bot' {
		return 'bot';
	}

	public onUpdateCharacter(listener: () => void): void {
		this.updateCharBus.add(listener);
	}
}
