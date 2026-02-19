import { ImageBlob } from "../../data/model/Outfit.js";
import { OutfitSlotState } from "../../data/model/OutfitSnapshots.js";
import { KeyedSlotPreset } from "../../data/model/SlotPreset.js";
import { OutfitTracker } from "../../data/tracker.js";
import { MutableOutfitView } from "../../data/view/MutableOutfitView.js";
import { SlotPresetRegistry } from "../../data/view/SlotPresetsView.js";
import { OutfitManager } from "../../manager/OutfitManager.js";
import { assertNever } from "../../shared.js";
import { createElement } from "../../util/ElementHelper.js";
import { resolveKebabCase } from "../../util/StringHelper.js";





export class SlotPresetsModal {

	private root: HTMLDivElement;

	private constructor(
		private readonly slot: OutfitSlotState,
		private readonly manager: OutfitManager,
		private readonly saveAndRender: () => void,
		private readonly close: () => void
	) {
		this.root = createElement('div', 'slot-presets-modal');

		const presets = this.registry.getAllSorted();

		const slotSection = createElement('div', 'slot-presets-slot-section');
		const otherSection = createElement('div', 'slot-presets-other-section');

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

		const saveBtn = createElement('button', 'slot-preset-btn slot-presets-save-btn', 'Save');
		saveBtn.addEventListener('click', () => this.saveSlotAsPreset());

		this.root.append(
			slotSection,
			otherSection,
			saveBtn
		);
	}

	public static show(
		slot: OutfitSlotState,
		manager: OutfitManager,
		saveAndRender: () => void
	): void {
		const overlay = createElement('div', 'slot-presets-overlay');
		const modal = new SlotPresetsModal(slot, manager, saveAndRender, () => {
			overlay.remove();
		});

		overlay.append(modal.root);
		document.body.append(overlay);

		overlay.addEventListener('click', (e) => {
			if (e.target === overlay) {
				overlay.remove();
			}
		});
	}

	public reshow(): void {
		this.close();
		SlotPresetsModal.show(this.slot, this.manager, this.saveAndRender);
	}


	private get registry(): SlotPresetRegistry {
		return OutfitTracker.slotPresets();
	}

	private getBlob(blobKey: string): ImageBlob | undefined {
		return OutfitTracker.images().getImage(blobKey);
	}

	private get outfit(): MutableOutfitView {
		return this.manager.getOutfitView();
	}


	private createPresetElement(preset: KeyedSlotPreset): HTMLDivElement | null {
		const imageBlob = this.getBlob(preset.imageKey);
		if (!imageBlob) return null;

		const el = createElement('div', 'slot-preset-item');

		const img = createElement('img', 'slot-preset-thumb');
		img.src = imageBlob.base64;
		img.alt = preset.value;

		const label = createElement('div', 'slot-preset-label', preset.key);
		const value = createElement('div', 'slot-preset-value', preset.value);
		value.tabIndex = 0;

		const textWrap = createElement('div', 'slot-preset-text');
		textWrap.append(label, value);

		const createBtn = (token: string, text: string, click: () => void) => {
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

	private usePreset(preset: KeyedSlotPreset): void {
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

		this.outfit.setValue(this.slot.id, preset.value);
		this.close();
		this.saveAndRender();
	}

	private saveSlotAsPreset(): void {
		const imageState = this.slot.getActiveImageState();

		if (!imageState) {
			// No image, no preset
			toastr.error('Slot must have an image in order to be saved as a preset');
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

		const { key: blobKey, width, height } = imageState.image;

		const old = this.registry.get(key);
		const preset: KeyedSlotPreset = {
			key,
			value: this.slot.value,
			imageKey: blobKey,
			imageWidth: width,
			imageHeight: height,
			createdAt: Date.now(),
			lastUsedAt: Date.now()
		};

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

	private deletePreset(preset: KeyedSlotPreset): void {
		const ok = confirm(`Are you sure you want to delete ${preset.key}?`);
		if (!ok) return;

		const ok2 = confirm(`Are you really sure?`);
		if (!ok2) return;

		this.registry.delete(preset.key);
		this.reshow();
	}
}