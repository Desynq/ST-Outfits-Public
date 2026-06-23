import * as SlotPresetApi from "../../api/internal/slot-preset.js";
import { OutfitTracker } from "../../data/tracker.js";
import { assertNever } from "../../shared.js";
import { div } from "../../util/element/divs.js";
import { createElement, el } from "../../util/ElementHelper.js";
import { SlotModal } from "./Modal.js";
export class SlotPresetsModal extends SlotModal {
    construct() {
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
    get registry() {
        return SlotPresetApi.getSlotPresetRegistry();
    }
    getRef(blobKey) {
        return OutfitTracker.viewGallery().getImageRef(blobKey);
    }
    get outfit() {
        return this.manager.getOutfitView();
    }
    createPresetElement(preset) {
        const imageBlob = this.getRef(preset.imageKey);
        if (!imageBlob)
            return null;
        const el = createElement('div', 'slot-preset-item');
        const img = createElement('img', 'slot-preset-thumb');
        img.src = imageBlob.url;
        img.alt = preset.value;
        const label = createElement('div', 'slot-preset-label', preset.key);
        const value = createElement('div', 'slot-preset-value', preset.value);
        value.tabIndex = 0;
        const textWrap = createElement('div', 'slot-preset-text');
        textWrap.append(label, value);
        const createBtn = (token, text, click) => {
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
    async usePreset(preset) {
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
    autoSavePreset() {
        const step = SlotPresetApi.beginSaveSlotAsPresetFromImageTag({ slot: this.slot, registry: this.registry });
        switch (step.type) {
            case 'no-image':
                toastr.error('Slot must have an image in order to be saved as a preset.');
                return;
            case 'ready':
                if (step.oldPreset) {
                    const ok = confirm(`Overwrite ${step.oldPreset.key}?`);
                    if (!ok) {
                        return;
                    }
                }
                step.save();
                this.manager.saveSettings();
                this.reshow();
                return;
            default: assertNever(step);
        }
    }
    savePreset() {
        if (!SlotPresetApi.canHavePreset(this.slot)) {
            // No image, no preset
            toastr.error('Slot must have an image in order to be saved as a preset.');
            return;
        }
        const key = SlotPresetApi.promptPresetKey();
        if (!key) {
            return;
        }
        const step = SlotPresetApi.beginSaveSlotAsPreset({ slot: this.slot, registry: this.registry, key });
        if (step.type === 'no-image') {
            throw new Error();
        }
        if (!SlotPresetApi.confirmPresetOverwrite(step, key)) {
            return;
        }
        step.save();
        this.manager.saveSettings();
        this.reshow();
    }
    deletePreset(preset) {
        const ok = confirm(`Are you sure you want to delete ${preset.key}?`);
        if (!ok)
            return;
        const ok2 = confirm(`Are you really sure?`);
        if (!ok2)
            return;
        this.registry.delete(preset.key);
        this.reshow();
    }
}
