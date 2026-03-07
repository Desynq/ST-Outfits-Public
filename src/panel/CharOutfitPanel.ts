import { OutfitTracker } from "../data/tracker.js";
import { CharPanelsView } from "../data/view/CharPanelsView.js";
import { BotPanelSettingsView, CharPanelSettingsView } from "../data/view/PanelViews.js";
import { CharOutfitManager } from "../manager/CharOutfitManager.js";
import { ShowOptions } from "../types/OutfitPanel.js";
import { el } from "../util/ElementHelper.js";
import { EventBus } from "../util/EventBus.js";
import { fromKebabCase } from "../util/StringHelper.js";
import { OutfitPanel } from "./OutfitPanel.js";
import { ICharPanelSwapper } from "./PanelRegistry.js";

export class CharOutfitPanel extends OutfitPanel<'char'> {

	private readonly destroyBus = new EventBus();

	private constructor(
		outfitManager: CharOutfitManager,
		private readonly swapper: ICharPanelSwapper
	) {
		super(outfitManager);
	}

	public static from(
		character: string,
		saveSettings: () => void,
		swapper: ICharPanelSwapper
	): CharOutfitPanel {
		const manager = new CharOutfitManager(saveSettings, character);
		const panel = new CharOutfitPanel(manager, swapper);

		manager.setFullSummaryTagResolver(() => panel.getPanelSettings().getFullSummaryTag());

		return panel;
	}

	public onDestroy(listener: () => void): this {
		this.destroyBus.add(listener);
		return this;
	}


	public get character(): string {
		return this.outfitManager.character;
	}

	private get panelsView(): CharPanelsView {
		return OutfitTracker.charPanels();
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

	public override getPanelSettings(): CharPanelSettingsView {
		return this.panelsView.getOrCreate(this.character);
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
		const tag = this.getPanelSettings().getFullSummaryTag()?.tag;
		if (tag === undefined) {
			return `${this.character}'s Outfit`;
		}

		if (this.character.toLowerCase().endsWith(tag)) {
			return `${this.character}`;
		}

		return `${this.character}'s ${fromKebabCase(tag)}`;
	}

	public override getPanelType(): 'char' {
		return 'char';
	}

	public override show(options: ShowOptions): boolean {
		if (!super.show(options)) return false;

		this.panelsView.setActive(this.character);
		this.outfitManager.saveSettings();

		return true;
	}

	public override close({ destroy = true }: { destroy?: boolean; } = {}): void {
		super.close();
		if (destroy) this.destroy();
	}

	private destroy(): void {
		this.panelEl?.remove();
		this.panelEl = null;

		this.outfitManager.clearSummaries();

		this.panelsView.removeActive(this.character);
		this.outfitManager.saveSettings();

		this.destroyBus.call();
	}

	protected override createOutfitActions(): HTMLDivElement {
		const actionsEl = super.createOutfitActions();

		const button = el('span', {
			className: 'outfit-action switch-panel-button no-highlight',
			text: '▼',
			events: {
				click: (): void => {
					menu.classList.toggle('--open');
				}
			}
		});

		const menu = el('div', {
			className: 'panel-switch-menu'
		});

		const rebuildMenu = (): void => {
			const panels = this.swapper.getCharPanels().filter(o => o !== this);

			const optionEls = panels.map(panel =>
				el('div', {
					className: 'panel-switch-option',
					text: panel.getHeaderTitle(),
					events: {
						click: (): void => {
							menu.classList.remove('--open');
							this.swapper.switchPanel(this, panel);
						}
					}
				})
			);
			menu.replaceChildren(...optionEls);
		};

		button.addEventListener('click', rebuildMenu);



		const dropdown = el('div', {
			className: 'panel-switch-dropdown',
			children: [button, menu]
		});

		actionsEl.prepend(dropdown);

		return actionsEl;
	}
}