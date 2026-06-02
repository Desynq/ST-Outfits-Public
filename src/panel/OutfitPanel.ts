import { XY } from "../data/model/Outfit.js";
import { OutfitTracker } from "../data/tracker.js";
import { IOutfitCollectionView } from "../data/view/OutfitCollectionView.js";
import { LayoutMode, PanelSettingsViewMap } from "../data/view/PanelViews.js";
import { isWideScreen } from "../shared.js";
import type { OutfitManagerMap, PanelType } from "../types/maps.js";
import { ShowOptions } from "../types/OutfitPanel.js";
import { mergeClassNames } from "../util/element/css.js";
import { clampPosition, enforceViewportBounds } from "../util/element/position.js";
import { createConfiguredElements, el, ElementOptions, toggleClasses } from "../util/ElementHelper.js";
import { EventBus, Listener } from "../util/EventBus.js";
import { ResourceCleaner } from "./Disposer.js";
import { OutfitSlotsHost } from "./OutfitSlotsHost.js";
import { OutfitTabsHost } from "./OutfitTabsHost.js";
import { SlotsRenderer } from "./SlotsRenderer.js";
import { OutfitTabsRenderer as TabsRenderer } from "./TabsRenderer.js";

export interface DropPacket {
	mode: LayoutMode;
	cursor: {
		x: number;
		y: number;
	};
	panel: {
		x: number;
		y: number;
	};
}

export abstract class OutfitPanel<T extends PanelType = PanelType> implements OutfitSlotsHost, OutfitTabsHost<T> {

	protected panelEl: HTMLDivElement | null = null;
	protected minimized: boolean = false;
	protected visible: boolean = false;
	protected disabled: boolean = false;

	protected readonly slotsRenderer: SlotsRenderer = new SlotsRenderer(this);
	protected readonly tabsRenderer: TabsRenderer = new TabsRenderer(this);

	protected readonly disposer: ResourceCleaner = new ResourceCleaner();

	protected readonly hideBus = new EventBus();
	protected readonly expandedBus = new EventBus();
	protected readonly dropBus = new EventBus<(packet: DropPacket) => void>();
	protected readonly focusBus = new EventBus();

	public constructor(
		public readonly outfitManager: OutfitManagerMap[T]
	) { }

	// Event registration

	public readonly onRenderDispose = (disposer: Disposer): void => this.disposer.add(disposer);

	public onHide(listener: () => void): void {
		this.hideBus.add(listener);
	}

	public onExpand(listener: () => void): void {
		this.expandedBus.add(listener);
	}

	public onDrop(listener: Parameters<typeof this.dropBus.add>[0]): void {
		this.dropBus.add(listener);
	}

	public onFocus(listener: Listener<typeof this.focusBus>): void {
		this.focusBus.add(listener);
	}




	public isMinimized(): boolean {
		return this.minimized;
	}

	public isVisible(): boolean {
		return this.visible;
	}

	public isFullscreen(): boolean {
		return !this.isMinimized() && !isWideScreen();
	}

	protected get collection(): IOutfitCollectionView {
		return this.outfitManager.getOutfitCollection();
	}

	public areDisabledSlotsHidden(): boolean {
		return this.collection.areDisabledSlotsHidden();
	}

	public toggleHideDisabled(): void {
		this.collection.hideDisabledSlots(!this.areDisabledSlotsHidden());
		this.saveAndRender();
	}


	public areEmptySlotsHidden(): boolean {
		return this.collection.areEmptySlotsHidden();
	}

	public toggleHideEmpty(): void {
		this.collection.hideEmptySlots(!this.areEmptySlotsHidden());
		this.saveAndRender();
	}


	public setFront(front: boolean): void {
		this.panelEl?.classList.toggle('--front', front);
	}





	public getLayoutMode(): LayoutMode {
		return isWideScreen() ? 'desktop' : 'mobile';
	}

	/**
	 * @throws if panel is not mounted
	 */
	public getBoundingClientRect(): DOMRect {
		if (!this.panelEl) {
			throw new Error('Panel element is not mounted');
		}
		return this.panelEl.getBoundingClientRect();
	}





	private reinitialize(): void {
		this.outfitManager.initializeOutfit();

		this.getPanelSettings().resetXY(this.getLayoutMode());
		this.outfitManager.saveSettings();
		this.restoreSizeAndPos();

		this.renderTabsAndActiveContent();
	}

	private restoreSize(): void {
		if (!this.panelEl) return;

		const mode = this.getLayoutMode();

		this.panelEl.style.height = '80vh';
		this.panelEl.style.width = mode === 'desktop' ? '24svw' : '90svw';
	}

	private restorePos(restoreX = true, restoreY = true): void {
		if (!this.panelEl) return;

		const mode = this.getLayoutMode();

		const [x, y] = this.getSavedXY(mode);
		if (restoreX) this.setX(x);
		if (restoreY) this.setY(y);
	}

	private forcePos(): void {
		const mode = this.getLayoutMode();

		const [x, y] = this.getPanelSettings().getXY(mode);
		this.setX(x);
		this.setY(y);
	}

	public setX(x: number): void {
		if (!this.panelEl) return;
		this.panelEl.style.left = `${x}px`;
	}

	public setY(y: number): void {
		if (!this.panelEl) return;
		this.panelEl.style.top = `${y}px`;
	}

	private restoreSizeAndPos(restoreX: boolean = true, restoreY: boolean = true): void {
		this.restoreSize();
		this.restorePos(restoreX, restoreY);
	}

	private resetSizeAndPos(): void {
		this.getPanelSettings().resetXY(this.getLayoutMode());
		this.outfitManager.saveSettings();

		this.restoreSizeAndPos();
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



	public renderTabsAndActiveContent(): void {
		this.disposer.dispose();
		if (!this.panelEl || this.minimized) return;

		this.applyTheme();
		this.expandHeader();

		const tabsContainer = this.panelEl.querySelector('.outfit-tabs') as HTMLDivElement | undefined;
		if (!tabsContainer) return;

		const contentArea = this.panelEl.querySelector('.outfit-content') as HTMLDivElement | undefined;
		if (!contentArea) return;

		this.tabsRenderer.renderTabs(tabsContainer, contentArea);

		const mode = this.getLayoutMode();
		if (mode !== 'mobile') {
			enforceViewportBounds(this.panelEl);
		}
	}

	public saveAndRender(): void {
		this.outfitManager.saveSettings();
		this.renderTabsAndActiveContent();
	}

	protected makePanelDraggable(): void {
		if (!this.panelEl) return;

		const handle = this.panelEl.querySelector(".outfit-header") as HTMLElement;
		if (!handle) return;

		let offsetX = 0;
		let offsetY = 0;
		let width = 0;
		let height = 0;

		const start = (e: PointerEvent): void => {
			if (!this.panelEl) return;

			if (this.isFullscreen()) return;

			handle.setPointerCapture(e.pointerId);

			const rect = this.panelEl.getBoundingClientRect();
			offsetX = e.clientX - rect.left;
			offsetY = e.clientY - rect.top;
			width = rect.width;
			height = rect.height;

			this.panelEl.style.position ||= 'absolute';
			this.panelEl.style.right = "auto";
			this.panelEl.style.left = rect.left + "px";
			this.panelEl.style.top = rect.top + "px";

			handle.addEventListener("pointermove", move);
			handle.addEventListener("pointerup", stop);
			handle.addEventListener("pointercancel", stop);
		};

		const move = (e: PointerEvent): void => {
			if (!this.panelEl) return;

			if (e.pointerType === 'touch') {
				e.preventDefault();
			}

			const x = e.clientX - offsetX;
			const y = e.clientY - offsetY;

			clampPosition({
				element: this.panelEl,
				x,
				y,
				width,
				height
			});
		};

		const stop = (e: PointerEvent): void => {
			if (handle.hasPointerCapture(e.pointerId)) {
				handle.releasePointerCapture(e.pointerId);
			}
			handle.removeEventListener("pointermove", move);
			handle.removeEventListener("pointerup", stop);
			handle.removeEventListener("pointercancel", stop);

			if (!this.panelEl) return;

			const left = parseFloat(this.panelEl.style.left);
			const top = parseFloat(this.panelEl.style.top);
			const mode = isWideScreen() ? 'desktop' : 'mobile';

			const panelSettings = this.getPanelSettings();
			if (panelSettings.isXYSaved()) {
				panelSettings.setXY(mode, left, top);
				this.outfitManager.saveSettings();
			}

			this.dropBus.emit({
				mode,
				cursor: {
					x: e.clientX,
					y: e.clientY
				},
				panel: {
					x: left,
					y: top
				}
			});
		};

		handle.addEventListener("pointerdown", (e) => {
			if (e.target !== handle) return;
			start(e);
		});
	}

	protected beginDragFromEvent(e: PointerEvent): void {
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




	public abstract getHeaderTitle(): string;

	protected createOutfitActions(): HTMLDivElement {

		const action = (options: ElementOptions<'span'>): HTMLSpanElement => el('span', {
			...options,
			className: mergeClassNames('outfit-action', 'no-highlight', options.className)
		});

		const actions = [
			action({
				className: 'minimize-button',
				text: '−',
				events: {
					click: () => this.toggleMinimize()
				}
			}),
			action({
				className: 'refresh-button',
				text: '↻',
				events: {
					click: () => this.reinitialize()
				}
			}),
			action({
				className: 'close-button',
				text: '×',
				events: {
					click: () => this.close()
				}
			})
		];

		const actionsEl = el('div', {
			className: 'outfit-actions',
			children: actions
		});

		return actionsEl;
	}

	private expandHeader(): void {
		if (!this.panelEl) return;
		const titleElement = this.panelEl.querySelector<HTMLElement>(".outfit-header h3");
		if (titleElement) titleElement.textContent = this.getHeaderTitle();
	}

	private collapseHeader(): void {
		if (!this.panelEl) return;
		const titleEl = this.panelEl.querySelector<HTMLElement>('.outfit-header h3');
		if (titleEl) titleEl.textContent = "";
	}


	protected toggleMinimize(): void {
		this.setMinimize(!this.minimized);
	}

	public setMinimize(minimize: boolean): void {
		const changed = minimize !== this.minimized;
		this.minimized = minimize;
		this.updateMinimizeState(changed);
	}

	private updateMinimizeState(changed: boolean): void {
		if (!this.panelEl) return;

		const minimizeBtn = this.panelEl.querySelector('.minimize-button') as HTMLElement;

		toggleClasses(this.panelEl, this.minimized, 'minimized');
		toggleClasses(this.panelEl, this.isFullscreen(), 'fullscreen');

		minimizeBtn.textContent = this.minimized ? '+' : '-';

		if (this.minimized) {
			this.collapseHeader();
		}
		else {
			this.renderTabsAndActiveContent();
		}

		if (changed && !this.minimized) {
			this.expandedBus.emit();
		}
	}

	public abstract getPanelType(): T;

	public abstract getPanelSettings(): PanelSettingsViewMap[T];

	public getSavedXY(mode: LayoutMode): XY {
		const panelSettings = this.getPanelSettings();
		if (panelSettings.isXYSaved()) {
			return panelSettings.getXY(mode);
		}
		else {
			return panelSettings.getDefaultXY(mode);
		}
	}

	public autoOpen(x?: number, y?: number): void {
		this.show({
			restoreX: x === undefined,
			restoreY: x === undefined
		});
		this.setMinimize(true);

		if (!this.panelEl) return;
		this.panelEl.style.left = `${x}px`;
		this.panelEl.style.top = `${y}px`;
	}



	public abstract exportButtonClickListener(): Promise<void>;






	protected abstract initializePanel(): boolean;

	protected wireEvents(): void {
		if (!this.panelEl) {
			throw new Error('Panel must be initialized before wiring events.');
		}

		this.panelEl.addEventListener(
			'pointerdown',
			() => {
				this.focusBus.emit();
			},
			true // capture phase
		);
	}








	public canShow(): boolean {
		return !this.disabled;
	}

	public show(
		options: ShowOptions = {}
	): boolean {
		if (!this.canShow()) return false;

		const {
			restoreX = false,
			restoreY = false,
			forcePos = false,
			resetSizeAndPos = false
		} = options;

		const initialized = this.initializePanel();

		if (resetSizeAndPos) {
			this.resetSizeAndPos();
		}
		else if (forcePos) {
			this.restoreSize();
			this.forcePos();
		}
		else if (initialized) {
			this.restoreSizeAndPos(restoreX, restoreY);
		}

		if (this.panelEl) {
			this.panelEl.hidden = false;
		}

		this.visible = true;
		this.renderTabsAndActiveContent();
		return true;
	}

	/**
	 * Hides the DOM until `show()` is called
	 */
	public close(): void {
		if (this.panelEl) {
			this.panelEl.hidden = true;
		}
		this.visible = false;
		this.minimized = false;

		this.hideBus.emit();
	}

	public hide(): void {
		if (this.panelEl) {
			this.panelEl.hidden = true;
		}
		this.visible = false;
		this.minimized = false;

		this.hideBus.emit();
	}

	public toggle(resetSizeAndPos = false): void {
		if (this.visible) {
			this.close();
			return;
		}

		this.show({
			resetSizeAndPos
		});
	}

	public disable(): void {
		this.disabled = true;
		this.close();
	}

	public enable(): void {
		this.disabled = false;
	}

	public applyTheme(): void {
		if (!this.panelEl) return;

		const s = this.getPanelSettings();

		this.panelEl.style.setProperty('--panel-bg-1', s.bgColor1);
		this.panelEl.style.setProperty('--panel-bg-2', s.bgColor2);
		this.panelEl.style.setProperty('--panel-border', s.borderColor);
	}
}