import { OutfitTracker } from "../data/tracker.js";
import { BotOutfitPanel } from "./BotOutfitPanel.js";
import { CharOutfitPanel } from "./CharOutfitPanel.js";
import { UserOutfitPanel } from "./UserOutfitPanel.js";



export class OutfitPanelRegistry {

	private readonly panels = new Map<string, CharOutfitPanel>();

	private botAutoOpenTimer: ReturnType<typeof setTimeout> | null = null;

	public constructor(
		saveSettings: () => void,
		private userPanel: UserOutfitPanel,
		private botPanel: BotOutfitPanel
	) {
		for (const active of OutfitTracker.charPanels().getActives()) {
			const { panel } = this.getOrCreate(active, saveSettings);
			panel.autoOpen();
		}

		botPanel.onUpdateCharacter(() => {
			if (this.isReserved(this.botPanel.character)) {
				this.botPanel.disable();
				return;
			}

			this.enableBotPanel();
		});

		if (OutfitTracker.isAutoOpen().user) {
			userPanel.autoOpen();
		}
	}

	public getOrCreate(
		character: string,
		saveSettings: Function
	): { panel: CharOutfitPanel; created: boolean; } {
		if (this.botPanel.character === character) {
			this.botPanel.disable();
		}

		let panel = this.panels.get(character);

		if (panel) return { panel, created: false };

		panel = CharOutfitPanel.from(character, saveSettings);
		panel.onHide(() => this.unregister(character));
		this.panels.set(character, panel);

		return { panel, created: true };
	}

	public unregister(character: string): void {
		this.panels.delete(character);

		if (this.botPanel.character === character) {
			this.enableBotPanel();
		}
	}

	public isReserved(character: string): boolean {
		return character === 'Unknown' || this.panels.has(character);
	}



	private enableBotPanel(): void {
		if (this.isReserved(this.botPanel.character)) return;

		this.botPanel.enable();

		if (!OutfitTracker.isAutoOpen().bot) {
			this.cancelBotAutoOpen();
			return;
		}

		this.cancelBotAutoOpen();
		this.botAutoOpenTimer = setTimeout(() => {
			this.botAutoOpenTimer = null;

			if (!OutfitTracker.isAutoOpen().bot) return;

			if (this.isReserved(this.botPanel.character)) return;

			this.botPanel.autoOpen();
		}, 100);
	}

	private cancelBotAutoOpen(): void {
		if (this.botAutoOpenTimer === null) return;
		clearTimeout(this.botAutoOpenTimer);
		this.botAutoOpenTimer = null;
	}
}