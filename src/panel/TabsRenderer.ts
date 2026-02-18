import { OutfitManager } from "../manager/OutfitManager";
import { SlotKind } from "../outfit/model/Outfit";
import { OutfitTracker } from "../outfit/tracker";
import { MutableOutfitView } from "../outfit/view/MutableOutfitView";
import { OutfitTabsHost } from "./OutfitTabsHost";

type OutfitTab = SlotKind | 'outfits';

export class OutfitTabsRenderer {

	private currentTab: OutfitTab = 'clothing';

	public constructor(
		private panel: OutfitTabsHost,
		private saveSettings: Function
	) { }

	private get outfitManager(): OutfitManager {
		return this.panel.getOutfitManager();
	}

	private get outfitView(): MutableOutfitView {
		return this.outfitManager.getOutfitView();
	}



	public changeTab(newTab: OutfitTab): void {

	}

	public renderTabs(tabsContainer: HTMLDivElement, contentArea: HTMLDivElement): void {
		this.recreateTabs(tabsContainer);
		contentArea.innerHTML = '';

		switch (this.currentTab) {
			case 'outfits':
				this.renderOutfits(contentArea);
				break;
			default:
				const slots = this.outfitManager.getOutfitView().slots
					.filter(s => s.kind === this.currentTab)
					.map(s => s.id);
				if (slots.length === 0) { // fallback
					tabsContainer.querySelector<HTMLButtonElement>('button[data-tab="outfits"]')?.click();
					return;
				}

				this.panel.getSlotsRenderer().renderSlots(this.currentTab, slots, contentArea);
				break;
		}
	}

	private recreateTabs(tabsContainer: HTMLDivElement): void {
		tabsContainer.innerHTML = '';
		const tabs: HTMLButtonElement[] = [];

		const kinds = this.outfitView.getSlotKinds();

		for (const kind of kinds) {
			const tab = this.createTab(kind);
			tabs.push(tab);
		}

		const outfitsTab = this.createTab('outfits');
		tabs.push(outfitsTab);

		const tabList = document.createElement('div');
		tabList.classList.add('outfit-tab-list');

		for (const tab of tabs) {
			tab.addEventListener('click', (event) => {
				// @ts-ignore
				const tabName = event.target.dataset.tab;
				this.currentTab = tabName;
				this.panel.renderContent();

				for (const t of tabs) {
					t.classList.remove('active');
				}
				// @ts-ignore
				event.target.classList.add('active');
			});

			if (tab !== outfitsTab) {
				tabList.appendChild(tab);
			}
		}

		tabsContainer.appendChild(tabList);
		tabsContainer.appendChild(outfitsTab);
		tabsContainer.appendChild(this.createAddTabButton());
	}

	private createTab(name: string): HTMLButtonElement {
		const tab = document.createElement('button');
		tab.classList.add('outfit-tab');

		if (this.currentTab === name) {
			tab.classList.add('active');
		}

		tab.dataset.tab = name;
		tab.textContent = this.formatKind(name);
		return tab;
	}

	private formatKind(kind: string): string {
		let result = '';
		let capitalizeNext = true; // start words capitalized

		for (let i = 0; i < kind.length; i++) {
			const char = kind[i];

			if (char === '-') {
				result += ' ';
				capitalizeNext = true;
				continue;
			}

			if (char === '_') {
				capitalizeNext = true;
				continue;
			}

			if (capitalizeNext) {
				result += char.toUpperCase();
				capitalizeNext = false;
			} else {
				result += char;
			}
		}

		return result;
	}


	private createAddTabButton(): HTMLButtonElement {
		const button = document.createElement('button');
		button.textContent = '+';
		button.classList.add('outfit-tab', 'add-tab');

		button.addEventListener('click', () => this.onAddTabClick());
		return button;
	}

	private normalizeKindInput(input: string): string {
		return input.trim().toLowerCase();
	}

	private onAddTabClick(): void {
		const raw = prompt(`
Rules:
• Use lowercase letters only
• Hyphens (-) separate words
• Underscore (_) capitalizes the next letter
• No numbers or special characters
• Cannot start or end words with _
• Cannot start or end with -
• "outfits" is reserved and cannot be used

New slot kind name:
`)?.trim();
		if (raw == null) return; // user cancelled

		const kind = this.normalizeKindInput(raw);

		const result = this.outfitManager.getOutfitView().addSlot(kind, kind);
		switch (result) {
			case 'slot-already-exists':
				this.panel.sendSystemMessage(`Make sure no pre-existing slots are named ${kind}.`);
				return;
			case 'invalid-slot-kind':
				this.panel.sendSystemMessage('Slot kind does not conform to rules.');
				return;
			case 'added':
				this.panel.renderContent();
				return;
		}
	}




	private renderOutfits(container: HTMLDivElement) {
		const presets = this.outfitManager.getPresets();

		if (presets.length === 0) {
			container.innerHTML = '<div>No saved outfits.</div>';
		} else {
			presets.forEach(preset => {
				const presetElement = document.createElement('div');
				presetElement.className = 'outfit-preset';
				presetElement.innerHTML = `
								<div class="preset-name">${preset}</div>
								<div class="preset-actions">
									<button class="load-preset" data-preset="${preset}">Wear</button>
									<button class="delete-preset" data-preset="${preset}">×</button>
								</div>
							`;

				presetElement.querySelector('.load-preset')!.addEventListener('click', async () => {
					const message = await this.outfitManager.loadPreset(preset);
					if (message) {
						this.panel.sendSystemMessage(message);
					}
					this.saveSettings();
					this.panel.renderContent();
				});

				presetElement.querySelector('.delete-preset')!.addEventListener('click', () => {
					if (confirm(`Delete "${preset}" outfit?`)) {
						const message = this.outfitManager.deletePreset(preset);
						if (message) {
							this.panel.sendSystemMessage(message);
						}
						this.saveSettings();
						this.panel.renderContent();
					}
				});

				container.appendChild(presetElement);
			});
		}

		const saveButton = document.createElement('button');
		saveButton.className = 'save-outfit-btn';
		saveButton.textContent = 'Save Current Outfit';
		saveButton.addEventListener('click', async () => {
			const presetName = prompt('Name this outfit:');
			if (presetName) {
				const message = await this.outfitManager.savePreset(presetName.trim());
				if (message) {
					this.panel.sendSystemMessage(message);
				}
				this.saveSettings();
				this.panel.renderContent();
			}
		});

		container.appendChild(saveButton);

		this.renderExportButton(container);
		this.renderOutfitPreviewButton(container);
	}

	private renderExportButton(container: HTMLDivElement) {
		const exportButton = document.createElement('button');
		exportButton.className = 'export-outfit-btn';
		exportButton.textContent = 'Export Current Outfit';

		exportButton.addEventListener('click', this.panel.exportButtonClickListener.bind(this));

		container.appendChild(exportButton);
	}

	private renderOutfitPreviewButton(container: HTMLDivElement): void {
		const previewButton = document.createElement('button');
		previewButton.className = 'save-outfit-btn';
		previewButton.textContent = 'Preview Outfit (LLM)';
		previewButton.addEventListener('click', () => {
			this.showOutfitPreview();
		});

		container.appendChild(previewButton);
	}

	private showOutfitPreview(): void {
		const overlay = document.createElement('div');
		overlay.className = 'outfit-preview-overlay';

		const modal = document.createElement('div');
		modal.className = 'outfit-preview-modal';

		/*html*/
		modal.innerHTML = `
		<div class="outfit-preview-header">
			<h3>What the AI Sees</h3>
			<button class="outfit-preview-close-btn">✕</button>
		</div>
		<div class="outfit-preview-body"></div>
		`;

		const previewBody = modal.querySelector<HTMLDivElement>('.outfit-preview-body')!;

		for (const kind of this.outfitManager.getOutfitView().getSlotKinds()) {
			const section = document.createElement('div');
			section.classList.add('outfit-preview-section');

			const header = document.createElement('h4');
			header.textContent = `${this.formatKind(kind)}`;

			const code = document.createElement('code');
			code.textContent = `{{getglobalvar::${this.outfitManager.getVarName(kind)}_summary}}`;

			const pre = document.createElement('pre');
			pre.classList.add('outfit-preview-text', `${kind}-summary`);
			pre.textContent = this.outfitManager.getKindSummary(kind);

			section.appendChild(header);
			section.appendChild(code);
			section.appendChild(pre);
			previewBody.appendChild(section);
		}

		overlay.appendChild(modal);
		document.body.appendChild(overlay);

		overlay.querySelector<HTMLButtonElement>('.outfit-preview-close-btn')!.addEventListener('click', () => {
			overlay.remove();
		});

		overlay.addEventListener('click', (e) => {
			if (e.target === overlay) overlay.remove();
		});
	}
}