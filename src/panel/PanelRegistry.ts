import { OutfitTracker } from "../data/tracker.js";
import { CharPanelGroupsView } from "../data/view/CharPanelGroupsView.js";
import { LayoutMode } from "../data/view/PanelViews.js";
import { PanelType } from "../types/maps.js";
import { EventBus, MappedEventBus } from "../util/EventBus.js";
import { BotOutfitPanel } from "./BotOutfitPanel.js";
import { CharOutfitPanel } from "./CharOutfitPanel.js";
import { DropPacket, OutfitPanel } from "./OutfitPanel.js";
import { UserOutfitPanel } from "./UserOutfitPanel.js";



export interface ICharPanelGrouper {
	ungroup(panel: CharOutfitPanel): void;
	focus(panel: CharOutfitPanel): boolean;
	getGroup(panel: CharOutfitPanel): CharOutfitPanel[];

	onGroupAppend(name: string, listener: (parent: CharOutfitPanel, child: CharOutfitPanel) => void): void;
	onGroupRemove(name: string, listener: (panel: CharOutfitPanel) => void): void;
	onGroupFocus(name: string, listener: (panel: CharOutfitPanel) => void): void;
}



export class OutfitPanelRegistry implements ICharPanelGrouper {

	private readonly panels = new Set<OutfitPanel<PanelType>>();
	private readonly charPanels = new Map<string, CharOutfitPanel>();

	private readonly groupAppendBus = new MappedEventBus<string, (parent: CharOutfitPanel, child: CharOutfitPanel) => void>();
	private readonly groupRemoveBus = new MappedEventBus<string, (panel: CharOutfitPanel) => void>();
	private readonly groupFocusBus = new MappedEventBus<string, (panel: CharOutfitPanel) => void>();

	private botAutoOpenTimer: ReturnType<typeof setTimeout> | null = null;

	public constructor(
		private readonly saveSettings: () => void,
		private readonly userPanel: UserOutfitPanel,
		private readonly botPanel: BotOutfitPanel
	) {
		this.panels
			.add(userPanel)
			.add(botPanel);

		this.openActiveCharPanels();

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

		for (const panel of this.panels) {
			panel.onExpand(() => this.handlePanelExpanded(panel));
			panel.onFocus(() => {
				for (const p of this.panels) {
					if (p === panel) continue;
					p.setFront(false);
				}

				panel.setFront(true);
			});
		}

		// this.resolveOverlaps();
	}

	public onGroupAppend(name: string, listener: (parent: CharOutfitPanel, child: CharOutfitPanel) => void): void {
		this.groupAppendBus.set(name, listener);
	}

	public onGroupRemove(name: string, listener: (panel: CharOutfitPanel) => void): void {
		this.groupRemoveBus.set(name, listener);
	}

	public onGroupFocus(name: string, listener: (panel: CharOutfitPanel) => void): void {
		this.groupFocusBus.set(name, listener);
	}

	private viewGroups(): CharPanelGroupsView {
		return OutfitTracker.viewCharPanels().viewGroups();
	}

	private openActiveCharPanels(): void {
		const groups = this.viewGroups();

		for (const name of OutfitTracker.viewCharPanels().getActives()) {
			const { panel } = this.getOrCreate(name);
			if (groups.isFollower(name)) {
				panel.hide();
			}
			else {
				panel.autoOpen();
			}
		}
	}

	private handlePanelExpanded(panel: OutfitPanel<PanelType>): void {
		for (const other of this.panels) {
			if (other === panel) continue;
			if (other.isMinimized()) continue;

			other.setMinimize(true);
		}
	}

	public getCharPanels(): readonly CharOutfitPanel[] {
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

		panel = CharOutfitPanel.from(
			character,
			this.saveSettings,
			this
		);
		// char panels can be created mid-chat
		panel.outfitManager.getOutfitCollection().loadFromChat();

		panel.onDestroy(() => this.unregister(character));
		panel.onDrop((packet) => this.handleCharPanelDrop(panel, packet));

		this.panels.add(panel);
		this.charPanels.set(character, panel);

		return { panel, created: true };
	}

	private handleCharPanelDrop(panel: CharOutfitPanel, packet: DropPacket): void {
		const { mode, cursor } = packet;
		const name = panel.character;
		const groups = this.viewGroups();

		groups.moveGroup(name, mode, cursor.x, cursor.y);

		let droppedOn: CharOutfitPanel | null = null;
		for (const [n, p] of this.charPanels) {
			if (n === name) continue;

			if (!p.isVisible()) continue;

			const rect = p.getBoundingClientRect();

			const inside =
				cursor.x >= rect.left &&
				cursor.x <= rect.right &&
				cursor.y >= rect.top &&
				cursor.y <= rect.bottom;

			if (inside) {
				droppedOn = p;
				break;
			}
		}

		if (droppedOn) {
			this.append(droppedOn, panel);
		}
	}

	public unregister(character: string): void {
		const panel = this.charPanels.get(character);
		if (!panel) {
			return;
		}

		this.groupAppendBus.remove(character);
		this.groupRemoveBus.remove(character);

		this.panels.delete(panel);
		this.charPanels.delete(character);

		this.viewGroups().remove(character);

		if (this.botPanel.character === character) {
			this.enableBotPanel();
		}

		this.saveSettings();
	}

	public isReserved(character: string): boolean {
		return character === 'Unknown' || this.charPanels.has(character);
	}

	public append(parent: CharOutfitPanel, child: CharOutfitPanel): void {
		const groups = this.viewGroups();
		groups.append(child.character, parent.character);

		child.close({ destroy: false });

		const parentMode = parent.getLayoutMode();
		const parentXY = parent.getPanelSettings().getXY(parentMode);
		child.getPanelSettings().setXY(parentMode, ...parentXY);

		this.saveSettings();
		this.groupAppendBus.emit(parent, child);
	}

	public ungroup(panel: CharOutfitPanel): void {
		const name = panel.character;
		const groups = this.viewGroups();

		const group = groups.getGroup(name);
		if (!group) return;

		const leader = this.getOrCreate(group[0]).panel;

		groups.remove(panel.character);

		const mode = leader.getLayoutMode();
		const [x, y] = this.computeUngroupPosition(panel, leader, group, mode);

		panel.getPanelSettings().setXY(mode, x, y);

		panel.show({
			forcePos: true
		});

		panel.setMinimize(false);

		this.saveSettings();
		this.groupRemoveBus.emit(panel);
	}

	private computeUngroupPosition(
		panel: CharOutfitPanel,
		leader: CharOutfitPanel,
		group: string[],
		mode: LayoutMode
	): [number, number] {
		const [leaderX, leaderY] = leader.getSavedXY(mode);

		if (panel === leader) {
			return [leaderX, leaderY];
		}

		leader.setMinimize(true);

		const rect = leader.getBoundingClientRect();
		const viewportMid = window.innerHeight / 2;
		const offset = rect.height + 8;
		const index = group.indexOf(panel.character);

		const direction = rect.top < viewportMid ? 1 : -1;

		return [leaderX, leaderY + offset * index * direction];
	}

	public focus(panel: CharOutfitPanel): boolean {
		if (!panel.canShow()) return false;

		const groups = this.viewGroups();
		const group = groups.getGroup(panel.character);
		if (!group) return false;

		const prevLeader = this.getOrCreate(group[0]).panel;

		const mode = prevLeader.getLayoutMode();
		const prevXY = prevLeader.getPanelSettings().getXY(mode);
		panel.getPanelSettings().setXY(mode, ...prevXY);

		prevLeader.close({ destroy: false });

		groups.focus(panel.character);
		panel.show({
			forcePos: true
		});
		panel.setMinimize(false);

		this.saveSettings();
		this.groupFocusBus.emit(panel);
		return true;
	}

	public getGroup(panel: CharOutfitPanel): CharOutfitPanel[] {
		const groups = this.viewGroups();

		const group = groups.getGroup(panel.character);
		if (!group) {
			return [];
		}

		return group.map(name => this.getOrCreate(name).panel);
	}



	private enableBotPanel(): void {
		if (this.isReserved(this.botPanel.character)) {
			return;
		}

		this.botPanel.enable();

		if (!OutfitTracker.isAutoOpen().bot) {
			return;
		}

		this.cancelBotAutoOpen(); // debounce
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

	private resolveOverlaps(): void {
		const Y_OFFSET = 48;

		let prev: OutfitPanel | null = null;
		for (const panel of this.panels) {
			if (prev) {
				const mode = panel.getLayoutMode();
				const settings = panel.getPanelSettings();
				const [x, y] = settings.getXY(mode);
				const [ox, oy] = prev.getPanelSettings().getXY(mode); // mode is global
				if (x === ox && y === oy) {
					prev.hide();
				}
			}
			prev = panel;
		}
	}
}