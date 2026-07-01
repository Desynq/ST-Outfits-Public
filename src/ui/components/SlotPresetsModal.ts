import * as SlotPresetsApi from "../../api/internal/slot-preset.js";
import { ImageRef, OutfitImage } from "../../data/model/Outfit.js";
import { KeyedSlotPreset, KeyedSlotPresetWithImage } from "../../data/model/SlotPreset.js";
import { OutfitTracker } from "../../data/tracker.js";
import { MutableOutfitView } from "../../data/view/MutableOutfitView.js";
import { SlotPresetRegistry } from "../../data/view/SlotPresetsView.js";
import { assertNever } from "../../shared.js";
import { div } from "../../util/element/divs.js";
import { createDiv, createElement, el } from "../../util/ElementHelper.js";
import { SlotModal } from "./Modal.js";





export class SlotPresetsModal extends SlotModal {

	protected override construct(): void {
		const presets = this.registry.getAllSorted();

		const content = div('slot-presets-content', this.root);

		const slotSection = div('slot-presets-slot-section', content);
		const otherSection = div('slot-presets-other-section', content);

		for (const preset of presets) {
			const presetEl = this.createPresetElement(preset);
			if (!presetEl) {
				this.registry.delete(preset.key);
				continue;
			}

			if (this.slot.hasPreset(preset)) {
				slotSection.append(presetEl);
			}
			else {
				otherSection.append(presetEl);
			}
		}

		const footer = div('footer', this.root);
		const footerLeft = div('footer-left', footer);
		const footerRight = div('footer-right', footer);

		const closeBtn = el('button', {
			className: 'slot-preset-btn close-button',
			text: 'X',
			events: {
				click: () => this.close()
			},
			parent: footerRight
		});

		el('button', {
			className: 'slot-preset-btn slot-presets-save-btn',
			text: 'Save',
			events: {
				click: () => this.savePreset()
			},
			parent: footerLeft
		});

		el('button', {
			className: 'slot-preset-btn slot-presets-save-btn',
			text: 'Autosave',
			events: {
				click: () => this.autoSavePreset()
			},
			parent: footerLeft
		});
	}


	private get registry(): SlotPresetRegistry {
		return SlotPresetsApi.getSlotPresetRegistry();
	}

	private getRef(blobKey: string): ImageRef | undefined {
		return OutfitTracker.viewGallery().getImageRef(blobKey);
	}

	private get outfit(): MutableOutfitView {
		return this.manager.getOutfitView();
	}


	private createPresetElement(preset: KeyedSlotPreset): HTMLDivElement | null {
		const el = createElement('div', 'slot-preset-item');

		const thumb = createDiv('slot-preset-thumb');

		if (preset.image) {
			const imageBlob = this.getRef(preset.image.key);

			if (imageBlob) {
				const img = createElement('img');
				img.src = imageBlob.url;
				img.alt = preset.value;
				thumb.append(img);
			}
			else {
				thumb.textContent = '🖼️';
				thumb.classList.add('missing');
			}
		}
		else {
			thumb.textContent = '📄';
			thumb.classList.add('placeholder');
		}

		el.append(thumb);


		const label = createElement('div', 'slot-preset-label', preset.key);
		const value = createElement('div', 'slot-preset-value', preset.value);
		value.tabIndex = 0;

		const textWrap = createElement('div', 'slot-preset-text');
		textWrap.append(label, value);

		const createBtn = (token: string, text: string, click: () => void): HTMLButtonElement => {
			const btn = createElement('button', 'slot-preset-btn', text);
			btn.classList.add(token);
			btn.addEventListener('click', click);
			return btn;
		};

		const useBtn = createBtn('use-btn', 'Use', () => this.usePreset(preset));
		const deleteBtn = createBtn('delete-btn', 'Delete', () => this.deletePreset(preset));

		const actionsEl = createElement('div', 'slot-preset-actions');
		actionsEl.append(useBtn, deleteBtn);

		el.append(textWrap, actionsEl);

		if (this.slot.hasPreset(preset)) {
			el.classList.add('attached');
		}

		return el;
	}

	private usePreset(preset: KeyedSlotPreset): void {
		this.manager.loadSlotPreset(this.slot.id, preset);
		this.close();
		this.saveAndRender();
	}

	private autoSavePreset(): void {
		const step = SlotPresetsApi.beginSaveSlotAsPresetAuto({ slot: this.slot, registry: this.registry });

		if (step.oldPreset) {
			const ok = confirm(`Overwrite ${step.oldPreset.key}?`);
			if (!ok) {
				return;
			}
		}

		step.save();
		this.manager.saveSettings();
		this.reshow();
	}

	private savePreset(): void {
		const key = SlotPresetsApi.promptPresetKey();
		if (!key) {
			return;
		}


		const step = SlotPresetsApi.beginSaveSlotAsPreset({ slot: this.slot, registry: this.registry, key });

		if (!SlotPresetsApi.confirmPresetOverwrite(step, key)) {
			return;
		}

		step.save();
		this.manager.saveSettings();
		this.reshow();
	}

	private deletePreset(preset: KeyedSlotPreset): void {
		const ok = confirm(`Are you sure you want to delete ${preset.key}?`);
		if (!ok) return;

		const ok2 = confirm(`Are you really sure?`);
		if (!ok2) return;

		this.registry.delete(preset.key);
		this.reshow();
	}
}