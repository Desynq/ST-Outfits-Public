import { ImageBlob, ImageRef, OutfitImage } from "../../data/model/Outfit.js";
import { OutfitSlotState } from "../../data/model/OutfitSnapshots.js";
import { KeyedSlotPreset } from "../../data/model/SlotPreset.js";
import { OutfitTracker } from "../../data/tracker.js";
import { MutableOutfitView } from "../../data/view/MutableOutfitView.js";
import { SlotPresetRegistry } from "../../data/view/SlotPresetsView.js";
import { OutfitManager } from "../../manager/OutfitManager.js";
import { assertNever } from "../../shared.js";
import { div } from "../../util/element/divs.js";
import { createDiv, createElement, el } from "../../util/ElementHelper.js";
import { resolveKebabCase } from "../../util/StringHelper.js";
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
		return OutfitTracker.slotPresets();
	}

	private getRef(blobKey: string): ImageRef | undefined {
		return OutfitTracker.viewGallery().getImageRef(blobKey);
	}

	private get outfit(): MutableOutfitView {
		return this.manager.getOutfitView();
	}


	private createPresetElement(preset: KeyedSlotPreset): HTMLDivElement | null {
		const imageBlob = this.getRef(preset.imageKey);
		if (!imageBlob) return null;

		const el = createElement('div', 'slot-preset-item');

		const img = createElement('img', 'slot-preset-thumb');
		img.src = imageBlob.url;
		img.alt = preset.value;

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

		el.append(img, textWrap, actionsEl);

		if (this.slot.hasPreset(preset)) {
			el.classList.add('attached');
		}

		return el;
	}

	private async usePreset(preset: KeyedSlotPreset): Promise<void> {
		const imageAttachOutcome = this.outfit.attachImage(this.slot.id, preset.key, preset.imageKey);
		switch (imageAttachOutcome) {
			case 'slot-not-found':
			case 'blob-does-not-exist':
				throw new Error();
			case 'attached-image':
				break;
			default: assertNever(imageAttachOutcome);
		}

		const imageResizeOutcome = this.outfit.resizeImage(this.slot.id, preset.key, preset.imageWidth, preset.imageHeight);
		switch (imageResizeOutcome) {
			case 'slot-not-found':
			case 'tag-does-not-exist':
				throw new Error();
			case 'noop':
			case 'resized':
				break;
			default: assertNever(imageResizeOutcome);
		}

		const imageActivateOutcome = this.outfit.setActiveImage(this.slot.id, preset.key);
		switch (imageActivateOutcome) {
			case 'slot-not-found':
			case 'image-does-not-exist':
				throw new Error();
			case 'image-already-active':
			case 'set-active-image':
				break;
			default: assertNever(imageActivateOutcome);
		}

		await this.manager.updateSlotValue(this.slot.id, preset.value);
		this.close();
		this.saveAndRender();
	}

	private autoSavePreset(): void {
		const imageState = this.slot.getActiveImageState();

		if (!imageState) {
			toastr.error('Slot must have an image in order to be saved as a preset.');
			return;
		}

		const old = this.registry.get(imageState.tag);

		const preset = this.buildPresetFromImage(imageState.tag, imageState.image);

		if (old) {
			const ok = confirm(`Overwrite ${imageState.tag}?`);
			if (!ok) return;
		}

		this.registry.set(preset);
		this.manager.saveSettings();
		this.reshow();
	}

	private savePreset(): void {
		const imageState = this.slot.getActiveImageState();

		if (!imageState) {
			// No image, no preset
			toastr.error('Slot must have an image in order to be saved as a preset.');
			return;
		}

		const raw = prompt('Enter image tag (kebab-case only):');
		if (!raw) {
			return;
		}

		const key = resolveKebabCase(raw);
		if (!key) {
			return;
		}

		const old = this.registry.get(key);
		const preset = this.buildPresetFromImage(key, imageState.image);

		if (old || this.slot.hasPreset(preset)) {
			const ok = confirm(`Preset "${key}" exists. Overwrite?`);
			if (!ok) {
				return;
			}
		}
		this.registry.set(preset);

		// no need to re-render
		this.manager.saveSettings();
		this.reshow();
	}

	private buildPresetFromImage(key: string, image: OutfitImage): KeyedSlotPreset {
		const { key: imageKey, width: imageWidth, height: imageHeight } = image;

		return {
			key,
			value: this.slot.value,
			imageKey,
			imageWidth,
			imageHeight,
			createdAt: Date.now(),
			lastUsedAt: Date.now()
		};
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