import { createButton } from "../../util/element/ButtonHelper.js";
import { createElement } from "../../util/ElementHelper.js";
import { PanelTab } from "./PanelTab.js";


export class OutfitsTab extends PanelTab {

	public override render(contentArea: HTMLDivElement): void {
		contentArea.innerHTML = '';
		const presets = this.outfitManager.getPresets();

		if (presets.length === 0) {
			const div = createElement('div', '', 'No saved outfits');
			contentArea.replaceChildren(div);
		}
		else {
			for (const preset of presets) {
				this.renderPreset(contentArea, preset);
			}
		}

		this.renderSaveButton(contentArea);
		this.renderExportButton(contentArea);
	}

	private renderPreset(contentArea: HTMLDivElement, preset: string): void {
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
			this.panel.saveAndRender();
		});

		presetElement.querySelector('.delete-preset')!.addEventListener('click', () => {
			if (confirm(`Delete "${preset}" outfit?`)) {
				const message = this.outfitManager.deletePreset(preset);
				if (message) {
					this.panel.sendSystemMessage(message);
				}
				this.panel.saveAndRender();
			}
		});

		contentArea.appendChild(presetElement);
	}

	private renderSaveButton(contentArea: HTMLDivElement): void {
		const saveOutfit = async () => {
			const presetName = prompt('Name this outfit:');
			if (presetName) {
				const message = await this.outfitManager.savePreset(presetName.trim());
				if (message) {
					this.panel.sendSystemMessage(message);
				}
				this.panel.saveAndRender();
			}
		};
		const saveButton = createButton(
			'system-tab-button save-outfit-btn',
			'Save Current Outfit',
			saveOutfit
		);

		contentArea.appendChild(saveButton);
	}

	private renderExportButton(contentArea: HTMLDivElement): void {
		const exportButton = createButton(
			'system-tab-button export-outfit-btn',
			'Export Current Outfit',
			() => this.panel.exportButtonClickListener()
		);

		contentArea.appendChild(exportButton);
	}
}