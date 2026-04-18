import { OutfitTracker } from "../data/tracker.js";
import { CharPanelsView } from "../data/view/CharPanelsView.js";
import { CharPanelSettingsView } from "../data/view/PanelViews.js";
import { CharOutfitManager } from "../manager/CharOutfitManager.js";
import { ShowOptions } from "../types/OutfitPanel.js";
import { el } from "../util/ElementHelper.js";
import { EventBus } from "../util/EventBus.js";
import { fromKebabCase } from "../util/StringHelper.js";
import { OutfitPanel } from "./OutfitPanel.js";
import { ICharPanelGrouper } from "./PanelRegistry.js";

export class CharOutfitPanel extends OutfitPanel<'char'> {

	private readonly destroyBus = new EventBus();

	private constructor(
		outfitManager: CharOutfitManager,
		private readonly grouper: ICharPanelGrouper
	) {
		super(outfitManager);
	}

	public static from(
		character: string,
		saveSettings: () => void,
		grouper: ICharPanelGrouper
	): CharOutfitPanel {
		const manager = new CharOutfitManager(saveSettings, character);
		const panel = new CharOutfitPanel(manager, grouper);

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
		return OutfitTracker.viewCharPanels();
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

	public override show(options: ShowOptions = {}): boolean {
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
		this.disposer.dispose();

		this.outfitManager.clearSummaries();

		this.panelsView.removeActive(this.character);
		this.outfitManager.saveSettings();

		this.destroyBus.emit();
	}

	protected override createOutfitActions(): HTMLDivElement {
		const actionsEl = super.createOutfitActions();

		const button = el('span', {
			className: 'outfit-action switch-panel-button no-highlight',
			text: '▼',
			events: {
				click: (): void => {
					openMenu();
				}
			}
		});

		const menu = el('div', {
			className: 'panel-switch-menu'
		});

		const rebuildMenu = (): void => {
			const panels = this.grouper.getGroup(this);

			const optionEls = panels.map(panel => {
				const remove = el('span', {
					className: 'panel-switch-remove no-highlight',
					text: '-',
					events: {
						click: (e: MouseEvent): void => {
							e.stopPropagation();
							this.grouper.ungroup(panel);
							rebuildMenu();
						}
					}
				});

				const canLoad = panel.getPanelSettings().canLoadFromChat();

				const lock = el('span', {
					className: `panel-switch-lock`,
					text: canLoad ? '📖' : '🌐'
				});
				// lock.classList.toggle('is-hidden', canLoad);

				const label = el('span', {
					className: 'panel-switch-label',
					text: panel.getHeaderTitle()
				});

				const option = el('div', {
					className: 'panel-switch-option',
					events: {
						click: (): void => {
							menu.classList.remove('--open');
							this.grouper.focus(panel);
						}
					},
					children: [lock, label, remove]
				});

				option.classList.toggle('is-current-panel', panel === this);

				const s = panel.getPanelSettings();
				option.style.setProperty('--panel-bg-1', s.bgColor1);
				option.style.setProperty('--panel-bg-2', s.bgColor2);
				option.style.setProperty('--panel-border', s.borderColor);

				return option;
			});

			menu.replaceChildren(...optionEls);
		};

		button.addEventListener('click', rebuildMenu);


		const positionMenu = (): void => {
			menu.style.left = '0px';
			menu.style.right = 'auto';

			const menuRect = menu.getBoundingClientRect();
			const panelRect = this.getBoundingClientRect();
			const overflowRight = menuRect.right - panelRect.right;

			if (overflowRight > 0) {
				menu.style.left = `${-overflowRight - 8}px`;
			}

			const adjustedRect = menu.getBoundingClientRect();
			if (adjustedRect.left < 8) {
				menu.style.left = `${parseFloat(menu.style.left || '0') + (8 - adjustedRect.left)}px`;
			}
		};

		const openMenu = (): void => {
			rebuildMenu();
			menu.classList.toggle('--open');
			positionMenu();
		};



		const dropdown = el('div', {
			className: 'panel-switch-dropdown',
			tabIndex: 0,
			children: [button, menu],
			events: {
				focusout: () => {
					menu.classList.remove('--open');
					menu.replaceChildren();
				}
			}
		});

		const groupAppend = (parent: CharOutfitPanel, child: CharOutfitPanel): void => {
			if (parent !== this) return;
			dropdown.hidden = false;
		};

		const groupFocus = (panel: CharOutfitPanel): void => {
			if (panel !== this) return;
			dropdown.hidden = false;
		};

		const groupRemove = (panel: CharOutfitPanel): void => {
			if (panel !== this) return;
			dropdown.hidden = true;
		};

		this.grouper.onGroupAppend(this.character, groupAppend);
		this.grouper.onGroupRemove(this.character, groupRemove);
		this.grouper.onGroupFocus(this.character, groupFocus);

		if (this.grouper.getGroup(this).length === 0) {
			dropdown.hidden = true;
		}

		actionsEl.prepend(dropdown);

		return actionsEl;
	}

	/**
	 * Saves to chat only if this panel is in chat-enabled mode.
	 * @returns `false` if chat persistence is disabled.
	 */
	public saveToChat(): boolean {
		if (!this.getPanelSettings().canLoadFromChat()) return false;

		OutfitTracker.characterOutfits(this.character).commitAutosave();
		return true;
	}

	public loadFromChat(): boolean {
		if (!this.getPanelSettings().canLoadFromChat()) return false;

		this.outfitManager.getOutfitCollection().loadFromChat();
		this.renderTabsAndActiveContent();
		return true;
	}
}