import { OutfitManager } from "../manager/OutfitManager.js";
import { IOutfitCollectionView, OutfitTracker } from "../outfit/tracker.js";
import { isMobile } from "../shared.js";
import { createConfiguredElements, queryOrThrow } from "../util/ElementHelper.js";
import { OutfitSlotsHost } from "./OutfitSlotsHost.js";
import { OutfitTabsHost } from "./OutfitTabsHost.js";
import { SlotsRenderer } from "./SlotsRenderer.js";
import { OutfitTabsRenderer as TabsRenderer } from "./TabsRenderer.js";

export abstract class OutfitPanel<T extends OutfitManager> implements OutfitSlotsHost, OutfitTabsHost {

	protected domElement: HTMLDivElement | null = null;
	protected minimized: boolean = false;
	protected isVisible: boolean = false;

	protected slotsRenderer: SlotsRenderer = new SlotsRenderer(this);
	protected tabsRenderer: TabsRenderer = new TabsRenderer(this);

	public constructor(
		protected outfitManager: T
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



	public getOutfitManager(): T {
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



	public renderContent(): void {
		if (!this.domElement || this.minimized) return;

		const tabsContainer = this.domElement.querySelector('.outfit-tabs') as HTMLDivElement | undefined;
		if (!tabsContainer) return;

		const contentArea = this.domElement.querySelector('.outfit-content') as HTMLDivElement | undefined;
		if (!contentArea) return;

		this.tabsRenderer.renderTabs(tabsContainer, contentArea);
	}

	public saveAndRenderContent(): void {
		this.outfitManager.saveSettings();
		this.renderContent();
	}




	protected makePanelDraggable() {
		if (!this.domElement) return;

		const handle = this.domElement.querySelector(".outfit-header") as HTMLElement;
		if (!handle) return;

		let offsetX = 0;
		let offsetY = 0;

		const start = (e: PointerEvent) => {
			if (!this.domElement) return;
			handle.setPointerCapture(e.pointerId);

			const rect = this.domElement.getBoundingClientRect();
			offsetX = e.clientX - rect.left;
			offsetY = e.clientY - rect.top;

			this.domElement.style.position ||= 'absolute';
			this.domElement.style.right = "auto";
			this.domElement.style.left = rect.left + "px";
			this.domElement.style.top = rect.top + "px";

			handle.addEventListener("pointermove", move);
			handle.addEventListener("pointerup", stop);
			handle.addEventListener("pointercancel", stop);
		};

		const move = (e: PointerEvent) => {
			if (!this.domElement) return;

			if (e.pointerType === 'touch') {
				e.preventDefault(); // stops scrolling
			}

			this.domElement.style.left = `${e.clientX - offsetX}px`;
			this.domElement.style.top = `${e.clientY - offsetY}px`;
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
		const handle = this.domElement?.querySelector(".outfit-header") as HTMLElement;

		if (!handle) return;

		// Simulate a pointerdown on the handle
		// So your existing dragging logic activates correctly
		handle.dispatchEvent(new PointerEvent("pointerdown", e));
	}


	protected makeHeaderMinimizable(): void {
		if (!this.domElement) return;

		const title = this.domElement.querySelector(".outfit-header h3") as HTMLElement;
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
					this.outfitManager.initializeOutfit();
					this.renderContent();
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
		if (!this.domElement) return;
		const titleElement = this.domElement.querySelector(".outfit-header h3");
		if (titleElement) titleElement.textContent = this.getHeaderTitle();
	}

	private collapseHeader(): void {
		if (!this.domElement) return;
		const titleEl = this.domElement.querySelector('.outfit-header h3') as HTMLElement;
		if (titleEl) titleEl.textContent = "";
	}


	protected toggleMinimize() {
		this.minimized = !this.minimized;
		this.updateMinimizeState();
	}

	private updateMinimizeState(): void {
		if (!this.domElement) return;

		const minimizeBtn = this.domElement.querySelector('.minimize-button') as HTMLElement;

		if (this.minimized) {
			this.domElement.classList.add("minimized");
			minimizeBtn.textContent = '+';
			this.collapseHeader();
		}
		else {
			this.domElement.classList.remove("minimized");
			minimizeBtn.textContent = '−';
			this.expandHeader();
			this.renderContent();
		}
	}

	public autoOpen(x: number, y: number): void {
		this.show();
		this.toggleMinimize();

		if (!this.domElement) return;

		this.domElement.style.left = `${x}px`;
		this.domElement.style.top = `${y}px`;
		this.domElement.style.right = "auto"; // ensure right doesn't override left positioning
	}



	public abstract exportButtonClickListener(): Promise<void>;

	protected abstract initializePanel(): void;

	public show() {
		this.initializePanel();

		this.renderContent();
		this.domElement!.style.display = 'flex';
		this.isVisible = true;
	}

	public hide() {
		if (this.domElement) {
			this.domElement.style.display = 'none';
		}
		this.isVisible = false;
		this.minimized = false;
	}

	public toggle() {
		this.isVisible ? this.hide() : this.show();
	}
}