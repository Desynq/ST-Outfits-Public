import { OutfitTracker } from "../data/tracker.js";
import { PanelType } from "../types/maps.js";
import { MappedEventBus } from "../util/EventBus.js";
import { BotOutfitPanel } from "./BotOutfitPanel.js";
import { CharOutfitPanel } from "./CharOutfitPanel.js";
import { OutfitPanel } from "./OutfitPanel.js";
import { UserOutfitPanel } from "./UserOutfitPanel.js";



export interface IPanelGrouper {
	focus(panel: OutfitPanel): boolean;
	getGroup(): OutfitPanel[];

	onGroupFocus(name: string, listener: (panel: OutfitPanel) => void): void;
}



export class OutfitPanelRegistry implements IPanelGrouper {

	private readonly panels = new Set<OutfitPanel>();
	private readonly panelOrder: OutfitPanel[] = [];

	private readonly charPanels = new Map<string, CharOutfitPanel>();
	private activePanel: OutfitPanel | null = null;

	private readonly groupFocusBus = new MappedEventBus<string, (panel: OutfitPanel) => void>();

	private botAutoOpenTimer: ReturnType<typeof setTimeout> | null = null;

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

		botPanel.onUpdateCharacter(() => {
			if (this.isReserved(this.botPanel.character)) {
				this.botPanel.disable();
				return;
			}

			this.openBotPanel();
		});

		if (OutfitTracker.isAutoOpen().user) {
			this.focus(userPanel);
			userPanel.setMinimize(true);
		}
	}

	private registerPanel(panel: OutfitPanel): void {
		if (this.panels.has(panel)) return;

		this.panels.add(panel);
		this.panelOrder.push(panel);

		panel.onFocus(() => {
			this.promotePanel(panel);

			for (const other of this.panels) {
				if (other === panel) continue;
				other.setFront(false);
			}

			panel.setFront(true);
		});

		panel.clickedClose.add(() => {
			this.autoFocus();
		});
	}

	private promotePanel(panel: OutfitPanel): void {
		const index = this.panelOrder.indexOf(panel);

		if (index <= 0) return;

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
		if (!panel.canShow()) return false;
		if (!this.panels.has(panel)) return false;

		if (this.activePanel === panel) {
			return true;
		}

		this.promotePanel(panel);

		if (this.activePanel) {
			this.activePanel.hide();
			this.activePanel.setFront(false);
		}

		this.activePanel = panel;

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

		this.cancelBotAutoOpen(); // debounce
		this.botAutoOpenTimer = setTimeout(() => {
			this.botAutoOpenTimer = null;

			if (!OutfitTracker.isAutoOpen().bot) return;

			if (this.isReserved(this.botPanel.character)) return;

			this.focus(this.botPanel);
			this.botPanel.setMinimize(true);
		}, 100);

		return true;
	}

	private cancelBotAutoOpen(): void {
		if (this.botAutoOpenTimer === null) return;

		clearTimeout(this.botAutoOpenTimer);
		this.botAutoOpenTimer = null;
	}
}