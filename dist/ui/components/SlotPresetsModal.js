import * as SlotPresetsApi from "../../api/internal/slot-preset.js";
import { OutfitTracker } from "../../data/tracker.js";
import { assertNever } from "../../shared.js";
import { div } from "../../util/element/divs.js";
import { createDiv, createElement, el } from "../../util/ElementHelper.js";
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
        return SlotPresetsApi.getSlotPresetRegistry();
    }
    getRef(blobKey) {
        return OutfitTracker.viewGallery().getImageRef(blobKey);
    }
    get outfit() {
        return this.manager.getOutfitView();
    }
    createPresetElement(preset) {
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
        el.append(textWrap, actionsEl);
        if (this.slot.hasPreset(preset)) {
            el.classList.add('attached');
        }
        return el;
    }
    usePreset(preset) {
        this.manager.loadSlotPreset(this.slot.id, preset);
        this.close();
        this.saveAndRender();
    }
    setSlotImageFromSlotPreset(preset) {
        const attachImageResult = this.outfit.attachImage(this.slot.id, preset.key, preset.image.key);
        switch (attachImageResult) {
            case 'slot-not-found':
            case 'blob-does-not-exist':
                throw new Error();
            case 'attached-image':
                break;
            default: assertNever(attachImageResult);
        }
        const resizeImageResult = this.outfit.resizeImage(this.slot.id, preset.key, preset.image.width, preset.image.height);
        switch (resizeImageResult) {
            case 'slot-not-found':
            case 'tag-does-not-exist':
                throw new Error();
            case 'noop':
            case 'resized':
                break;
            default: assertNever(resizeImageResult);
        }
        const setActiveImageResult = this.outfit.setActiveImage(this.slot.id, preset.key);
        switch (setActiveImageResult) {
            case 'slot-not-found':
            case 'image-does-not-exist':
                throw new Error();
            case 'image-already-active':
            case 'set-active-image':
                break;
            default: assertNever(setActiveImageResult);
        }
        return true;
    }
    autoSavePreset() {
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
    savePreset() {
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
