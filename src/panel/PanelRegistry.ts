import { ContextSlot } from "../data/model/Outfit.js";
import { OutfitTracker } from "../data/tracker.js";
import { MappedEventBus } from "../util/EventBus.js";
import { BotOutfitPanel } from "./BotOutfitPanel.js";
import { CharOutfitPanel } from "./CharOutfitPanel.js";
import { OutfitPanel } from "./OutfitPanel.js";
import { UserOutfitPanel } from "./UserOutfitPanel.js";



export interface IPanelGrouper {
	focus(panel: OutfitPanel): boolean;
	getGroup(): OutfitPanel[];

	onGroupFocus(name: string, listener: (panel: OutfitPanel) => void): void;

	recontextualize(options: RecontextualizeOptions): void;
}

export interface RecontextualizeOptions {
	allPanels?: boolean;
	filter?: (slot: ContextSlot) => boolean;
}



export class OutfitPanelRegistry implements IPanelGrouper {

	private readonly panels = new Set<OutfitPanel>();
	private readonly panelOrder: OutfitPanel[] = [];

	private readonly charPanels = new Map<string, CharOutfitPanel>();
	private activePanel: OutfitPanel | null = null;

	private readonly groupFocusBus = new MappedEventBus<string, (panel: OutfitPanel) => void>();

	private botAutoOpenTimer: ReturnType<typeof setTimeout> | null = null;
	private readonly initialPanelId = OutfitTracker.viewUIState().lastPanelId;
	private readonly initializationDeadline = Date.now() + 2000;

	private initialPanelOpened = false;
	private lastCharacter: string | null = null;

	public constructor(
		private readonly saveSettings: () => void,
		private readonly userPanel: UserOutfitPanel,
		private readonly botPanel: BotOutfitPanel,
		private readonly getCurrentCharacterKey: () => string | null
	) {
		const globalPanels = [userPanel, botPanel];

		for (const panel of globalPanels) {
			panel.setGrouper(this);
			this.registerPanel(panel);
		}

		this.openActiveCharPanels();
		this.sortInitialOrder();

		this.initialPanelOpened = this.restoreLastPanel();

		if (!this.initialPanelOpened && OutfitTracker.isAutoOpen().user) {
			this.initialPanelOpened = this.focus(userPanel);

			if (this.initialPanelOpened) {
				userPanel.setMinimize(true);
			}
		}

		botPanel.onUpdateCharacter(() => {
			this.handleCharacterUpdate();
		});
	}

	public refreshActivePanel(): void {
		this.activePanel?.renderTabsAndActiveContent();
	}

	public recontextualize({
		allPanels = false,
		filter
	}: RecontextualizeOptions): void {
		if (allPanels) {
			for (const panel of this.panels) {
				panel.outfitManager.recontextualize(filter);
			}
		}
		else {
			this.activePanel?.outfitManager.recontextualize(filter);
		}
	}



	private registerPanel(panel: OutfitPanel): void {
		if (this.panels.has(panel)) {
			return;
		}

		this.panels.add(panel);
		this.panelOrder.push(panel);

		panel.onFocus(() => {
			this.promotePanel(panel);

			for (const other of this.panels) {
				if (other === panel) {
					continue;
				}
				other.setFront(false);
			}

			panel.setFront(true);
		});

		panel.clickedClose.add(() => {
			this.autoFocus();
		});
	}

	private restoreLastPanel(): boolean {
		if (!this.initialPanelId) {
			return false;
		}

		if (this.initialPanelId === this.botPanel.outfitManager.getName()) {
			return true;
		}

		const panel = this.getGroup().find(
			panel => panel.outfitManager.getName() === this.initialPanelId
		);

		if (!panel || !this.focus(panel)) {
			return false;
		}

		panel.setMinimize(true);
		return true;
	}

	private promotePanel(panel: OutfitPanel): void {
		const index = this.panelOrder.indexOf(panel);

		if (index <= 0) {
			return;
		}

		this.panelOrder.splice(index, 1);
		this.panelOrder.unshift(panel);
	}

	private sortInitialOrder(): void {
		this.panelOrder.sort((a, b) =>
			a.getHeaderTitle().localeCompare(
				b.getHeaderTitle(),
				undefined,
				{
					numeric: true,
					sensitivity: 'base'
				}
			)
		);
	}

	public onGroupFocus(name: string, listener: (panel: OutfitPanel) => void): void {
		this.groupFocusBus.set(name, listener);
	}

	private openActiveCharPanels(): void {
		const actives = OutfitTracker.viewCharPanels().getActives();

		for (const name of actives) {
			const { panel } = this.getOrCreate(name);
			panel.hide();
		}
	}

	public getCharPanels(): CharOutfitPanel[] {
		return Array.from(this.charPanels.values());
	}

	public getOrCreate(
		character: string
	): { panel: CharOutfitPanel; created: boolean; } {
		if (this.botPanel.character === character) {
			this.botPanel.disable();
		}

		let panel = this.charPanels.get(character);

		if (panel) {
			return { panel, created: false };
		}

		panel = CharOutfitPanel.from({
			characterKey: character,
			saveSettings: this.saveSettings,
			grouper: this,
			getCurrentCharacterKey: this.getCurrentCharacterKey
		});

		// char panels can be created mid-chat
		if (panel.getPanelSettings().canLoadFromChat()) {
			panel.outfitManager.getOutfitCollection().loadCurrentOutfitFromChat();
		}

		panel.onDestroy(() => this.unregisterCustomPanel(character));

		this.registerPanel(panel);
		this.charPanels.set(character, panel);

		return { panel, created: true };
	}

	public unregisterCustomPanel(character: string): void {
		const panel = this.charPanels.get(character);
		if (!panel) {
			return;
		}

		this.panels.delete(panel);
		this.charPanels.delete(character);
		this.groupFocusBus.remove(character);

		const orderIndex = this.panelOrder.indexOf(panel);
		if (orderIndex !== -1) {
			this.panelOrder.splice(orderIndex, 1);
		}

		if (this.activePanel === panel) {
			this.activePanel = null;
		}

		if (this.botPanel.character === character) {
			const replaced = this.openBotPanel();
			if (!replaced) {
				this.autoFocus();
			}
		}
		else {
			this.autoFocus();
		}

		this.saveSettings();
	}

	public isReserved(character: string): boolean {
		return character === 'Unknown' || this.charPanels.has(character);
	}

	/**
	 * Focuses the given panel.
	 * 
	 * Calling this with the already focused panel has no effect
	 */
	public focus(panel: OutfitPanel): boolean {
		if (!panel.canShow()) {
			return false;
		}

		if (!this.panels.has(panel)) {
			return false;
		}

		if (this.activePanel === panel) {
			return true;
		}

		this.promotePanel(panel);

		if (this.activePanel) {
			this.activePanel.hide();
			this.activePanel.setFront(false);
		}

		this.activePanel = panel;

		const panelId = panel.outfitManager.getName();
		const uiState = OutfitTracker.viewUIState();

		uiState.setLastPanel(panelId);
		this.saveSettings();

		const lastTabId = uiState.getLastTab(panelId);

		if (lastTabId !== undefined) {
			panel.restoreTab(lastTabId);
		}

		panel.show();
		panel.setFront(true);

		this.groupFocusBus.emit(panel);

		return true;
	}

	private autoFocus(): boolean {
		const panel = this.getGroup()[0];

		if (!panel) {
			this.activePanel = null;
			return false;
		}

		return this.focus(panel);
	}

	public getGroup(): OutfitPanel[] {
		return [...this.panelOrder].filter(panel => panel.canShow());
	}



	private openBotPanel(): boolean {
		if (this.isReserved(this.botPanel.character)) {
			return false;
		}

		this.botPanel.enable();

		if (!OutfitTracker.isAutoOpen().bot) {
			return false;
		}

		this.focus(this.botPanel);
		this.botPanel.setMinimize(true);
		return true;
	}

	private handleCharacterUpdate(): void {
		const character = this.botPanel.character;
		const reserved = this.charPanels.has(character);

		const characterChanged = character !== this.lastCharacter;
		this.lastCharacter = character;

		// Keep the bot panel available for Unknown.
		if (reserved) {
			this.botPanel.disable();
		}
		else {
			this.botPanel.enable();
		}

		// Unknown should update the panel without automatically focusing it.
		if (character === 'Unknown') {
			return;
		}

		if (
			character !== 'Unknown'
			&& !reserved
			&& this.initialPanelId === this.botPanel.outfitManager.getName()
			&& this.activePanel === null
		) {
			if (this.focus(this.botPanel)) {
				this.botPanel.setMinimize(true);
			}
			return;
		}

		// Preserve the initially restored panel during startup.
		if (
			this.initialPanelOpened
			&& Date.now() < this.initializationDeadline
		) {
			return;
		}

		this.focus(this.botPanel);
		this.botPanel.setMinimize(true);
	}
}