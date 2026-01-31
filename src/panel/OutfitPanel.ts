import { OutfitManager } from "../manager/OutfitManager.js";
import { IOutfitCollectionView, OutfitTracker } from "../data/tracker.js";
import { isMobile } from "../shared.js";
import { createConfiguredElements, queryOrThrow } from "../util/ElementHelper.js";
import { OutfitSlotsHost } from "./OutfitSlotsHost.js";
import { OutfitTabsHost } from "./OutfitTabsHost.js";
import { SlotsRenderer } from "./SlotsRenderer.js";
import { OutfitTabsRenderer as TabsRenderer } from "./TabsRenderer.js";
import { LayoutMode, PanelSettingsViewMap } from "../data/view/PanelViews.js";
import { XY } from "../data/model/Outfit.js";
import type { OutfitManagerMap, PanelType } from "../types/maps.js";

export abstract class OutfitPanel<T extends PanelType> implements OutfitSlotsHost, OutfitTabsHost<T> {

	protected panelEl: HTMLDivElement | null = null;
	protected minimized: boolean = false;
	protected isVisible: boolean = false;

	protected slotsRenderer: SlotsRenderer = new SlotsRenderer(this);
	protected tabsRenderer: TabsRenderer = new TabsRenderer(this);

	public constructor(
		protected outfitManager: OutfitManagerMap[T]
	) { }

	public isMinimized(): boolean {
		return this.minimized;
	}

	protected get collection(): IOutfitCollectionView {
		return this.outfitManager.getOutfitCollection();
	}

	public areDisabledSlotsHidden(): boolean {
		return this.collection.areDisabledSlotsHidden();
	}

	public toggleHideDisabled(): void {
		this.collection.hideDisabledSlots(!this.areDisabledSlotsHidden());
		this.saveAndRenderContent();
	}


	public areEmptySlotsHidden(): boolean {
		return this.collection.areEmptySlotsHidden();
	}

	public toggleHideEmpty(): void {
		this.collection.hideEmptySlots(!this.areEmptySlotsHidden());
		this.saveAndRenderContent();
	}



	private reinitialize(): void {
		this.outfitManager.initializeOutfit();
		this.resetPanel();
		this.render();
	}

	private resetPanel(setDefaultX: boolean = true, setDefaultY: boolean = true): void {
		if (!this.panelEl) return;
		const isWide = window.matchMedia('(min-width: 1024px)').matches;

		this.panelEl.style.height = '80vh';
		this.panelEl.style.width = isWide ? '24svw' : '90svw';

		const [x, y] = this.getDefaultXY(isWide ? 'desktop' : 'mobile');
		if (setDefaultX) this.panelEl.style.left = `${x}px`;
		if (setDefaultY) this.panelEl.style.top = `${y}px`;
	}



	public getOutfitManager(): OutfitManagerMap[T] {
		return this.outfitManager;
	}

	public getSlotsRenderer(): SlotsRenderer {
		return this.slotsRenderer;
	}

	public sendSystemMessage(message: string): void {
		// Use toastr popup instead of /sys command
		if (OutfitTracker.areSystemMessagesEnabled()) {
			toastr.info(message, 'Outfit System', {
				timeOut: 4000,
				extendedTimeOut: 8000
			});
		}
	}



	public render(): void {
		if (!this.panelEl || this.minimized) return;

		const tabsContainer = this.panelEl.querySelector('.outfit-tabs') as HTMLDivElement | undefined;
		if (!tabsContainer) return;

		const contentArea = this.panelEl.querySelector('.outfit-content') as HTMLDivElement | undefined;
		if (!contentArea) return;

		this.tabsRenderer.renderTabs(tabsContainer, contentArea);
	}

	public saveAndRenderContent(): void {
		this.outfitManager.saveSettings();
		this.render();
	}




	protected makePanelDraggable() {
		if (!this.panelEl) return;

		const handle = this.panelEl.querySelector(".outfit-header") as HTMLElement;
		if (!handle) return;

		let offsetX = 0;
		let offsetY = 0;

		const start = (e: PointerEvent) => {
			if (!this.panelEl) return;
			handle.setPointerCapture(e.pointerId);

			const rect = this.panelEl.getBoundingClientRect();
			offsetX = e.clientX - rect.left;
			offsetY = e.clientY - rect.top;

			this.panelEl.style.position ||= 'absolute';
			this.panelEl.style.right = "auto";
			this.panelEl.style.left = rect.left + "px";
			this.panelEl.style.top = rect.top + "px";

			handle.addEventListener("pointermove", move);
			handle.addEventListener("pointerup", stop);
			handle.addEventListener("pointercancel", stop);
		};

		const move = (e: PointerEvent) => {
			if (!this.panelEl) return;

			if (e.pointerType === 'touch') {
				e.preventDefault(); // stops scrolling
			}

			this.panelEl.style.left = `${e.clientX - offsetX}px`;
			this.panelEl.style.top = `${e.clientY - offsetY}px`;
		};

		const stop = (e: PointerEvent) => {
			if (handle.hasPointerCapture(e.pointerId)) {
				handle.releasePointerCapture(e.pointerId);
			}
			handle.removeEventListener("pointermove", move);
			handle.removeEventListener("pointerup", stop);
			handle.removeEventListener("pointercancel", stop);
		};

		handle.addEventListener("pointerdown", (e) => {
			if (e.target !== handle) return;
			start(e);
		});
	}

	protected beginDragFromEvent(e: PointerEvent) {
		const handle = this.panelEl?.querySelector(".outfit-header") as HTMLElement;

		if (!handle) return;

		// Simulate a pointerdown on the handle
		// So your existing dragging logic activates correctly
		handle.dispatchEvent(new PointerEvent("pointerdown", e));
	}


	protected makeHeaderMinimizable(): void {
		if (!this.panelEl) return;

		const title = this.panelEl.querySelector(".outfit-header h3") as HTMLElement;
		if (!title) return;

		let startX = 0;
		let startY = 0;
		let pressTimer: number | null = null;
		let dragging = false;

		const DRAG_THRESHOLD = 7;      // px
		const HOLD_THRESHOLD = 150;    // ms

		title.addEventListener("pointerdown", (e) => {
			startX = e.clientX;
			startY = e.clientY;
			dragging = false;

			// Start timer: if held long enough, treat as drag
			pressTimer = window.setTimeout(() => {
				dragging = true;
				this.beginDragFromEvent(e);  // <— you'll add this below
			}, HOLD_THRESHOLD);
		});

		title.addEventListener("pointermove", (e) => {
			if (!pressTimer) return;

			const dx = Math.abs(e.clientX - startX);
			const dy = Math.abs(e.clientY - startY);

			// If finger moves enough → start dragging right away
			if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
				dragging = true;
				clearTimeout(pressTimer);
				pressTimer = null;
				this.beginDragFromEvent(e);  // <— hook into your drag logic
			}
		});

		title.addEventListener("pointerup", (e) => {
			if (pressTimer) {
				clearTimeout(pressTimer);
				pressTimer = null;

				if (!dragging && e.button === 0) {
					// Treat as tap
					this.toggleMinimize();
				}
			}

			dragging = false;
		});

		title.addEventListener("pointercancel", () => {
			if (pressTimer) {
				clearTimeout(pressTimer);
				pressTimer = null;
			}
			dragging = false;
		});
	}




	protected abstract getHeaderTitle(): string;

	protected createOutfitActions(): HTMLDivElement {
		const div = document.createElement('div');
		div.classList.add('outfit-actions');

		const createSpan = () => document.createElement('span');

		const actions = createConfiguredElements(createSpan,
			(minimizeBtn) => {
				minimizeBtn.classList.add('minimize-button');
				minimizeBtn.textContent = '−';
				minimizeBtn.addEventListener('click', () => this.toggleMinimize());
			},
			(refreshBtn) => {
				refreshBtn.classList.add('refresh-button');
				refreshBtn.textContent = '↻';
				refreshBtn.addEventListener('click', () => {
					this.reinitialize();
				});
			},
			(closeBtn) => {
				closeBtn.classList.add('close-button');
				closeBtn.textContent = '×';
				closeBtn.addEventListener('click', () => {
					this.hide();
				});
			}
		);

		for (const action of actions) {
			action.classList.add('outfit-action', 'no-highlight');
		}

		div.append(...actions);

		return div;
	}

	private expandHeader(): void {
		if (!this.panelEl) return;
		const titleElement = this.panelEl.querySelector(".outfit-header h3");
		if (titleElement) titleElement.textContent = this.getHeaderTitle();
	}

	private collapseHeader(): void {
		if (!this.panelEl) return;
		const titleEl = this.panelEl.querySelector('.outfit-header h3') as HTMLElement;
		if (titleEl) titleEl.textContent = "";
	}


	protected toggleMinimize() {
		this.minimized = !this.minimized;
		this.updateMinimizeState();
	}

	private updateMinimizeState(): void {
		if (!this.panelEl) return;

		const minimizeBtn = this.panelEl.querySelector('.minimize-button') as HTMLElement;

		if (this.minimized) {
			this.panelEl.classList.add("minimized");
			minimizeBtn.textContent = '+';
			this.collapseHeader();
		}
		else {
			this.panelEl.classList.remove("minimized");
			minimizeBtn.textContent = '−';
			this.expandHeader();
			this.render();
		}
	}

	public abstract getPanelType(): PanelType;

	public getPanelSettings(): PanelSettingsViewMap[T] {
		return OutfitTracker.panelSettings(this.getPanelType());
	}

	public getDefaultXY(mode: LayoutMode): XY {
		return OutfitTracker.panelSettings(this.getPanelType()).getXY(mode);
	}

	public autoOpen(x?: number, y?: number): void {
		this.show(x === undefined, y === undefined);
		this.toggleMinimize();

		if (!this.panelEl) return;
		this.panelEl.style.left = `${x}px`;
		this.panelEl.style.top = `${y}px`;
	}



	public abstract exportButtonClickListener(): Promise<void>;

	protected abstract initializePanel(): boolean;

	public show(setDefaultX: boolean = false, setDefaultY: boolean = false) {
		if (this.initializePanel()) {
			this.resetPanel(setDefaultX, setDefaultY);
		}

		if (this.panelEl) {
			this.panelEl.hidden = false;
		}

		this.isVisible = true;
		this.render();
	}

	public hide() {
		if (this.panelEl) {
			this.panelEl.hidden = true;
		}
		this.isVisible = false;
		this.minimized = false;
	}

	public toggle() {
		this.isVisible ? this.hide() : this.show();
	}
}