import { OutfitTracker } from "../../data/tracker.js";
import { assertNever } from "../../shared.js";
import { ImageLightbox } from "../../ui/components/ImageLightbox.js";
import { popupConfirm } from "../../util/adapter/popup-adapter.js";
import { addDoubleTapListener } from "../../util/element/click-actions.js";
import { createElement, setElementSize } from "../../util/ElementHelper.js";
import { promptImageUpload, resizeImage } from "../../util/image-utils.js";
import { OutfitPanelContext } from "../base/OutfitPanelContext.js";
import { showImagePicker } from "./prompt-images.js";
;
export class SlotImageElementFactory extends OutfitPanelContext {
    constructor(panel, boundaryWidth) {
        super(panel);
        this.boundaryWidth = boundaryWidth;
    }
    build(slot) {
        return new SlotImageElement(this.panel, this.boundaryWidth, slot);
    }
}
class SlotImageElement extends OutfitPanelContext {
    constructor(panel, boundaryWidth, slot) {
        super(panel);
        this.boundaryWidth = boundaryWidth;
        this.slot = slot;
        this.imgWrapper = createElement('div', 'slot-image-wrapper');
        const imageState = this.slot.getActiveImageState();
        const { onSingleTap, appendControls, noDoubleTap } = this.renderImageContent(imageState);
        if (noDoubleTap) {
            this.imgWrapper.addEventListener('click', () => this.changeImage());
        }
        else {
            addDoubleTapListener(this.imgWrapper, () => this.changeImage(), 300, onSingleTap);
        }
        this.appendControls = appendControls;
    }
    append(container) {
        container.append(this.imgWrapper);
    }
    get imagesView() {
        return OutfitTracker.images();
    }
    renderImageContent(imageState) {
        if (!imageState) {
            this.imgWrapper.classList.add('--empty');
            this.imgWrapper.textContent = 'Add Image';
            return {
                imgEl: null,
                noDoubleTap: true
            };
        }
        const result = this.createImage(imageState);
        if (!result.ok) {
            switch (result.reason) {
                case 'active-image-tag-not-stored':
                case 'image-blob-does-not-exist':
                    this.imgWrapper.classList.add('--error');
                    this.imgWrapper.textContent = 'Error';
                    return { imgEl: null };
                case 'image-hidden':
                    this.imgWrapper.classList.add('--hidden');
                    this.imgWrapper.textContent = 'Show Image';
                    return {
                        imgEl: null,
                        onSingleTap: () => this.toggleImage()
                    };
                default: assertNever(result.reason);
            }
        }
        const { imgEl, imgBlob, imgTag } = result.value;
        this.imgWrapper.append(imgEl);
        const resizeHandle = this.createResizeHandle();
        this.imgWrapper.append(resizeHandle);
        const deleteBtn = this.createDeleteBtn();
        const toggleBtn = this.createToggleBtn();
        const resizeBtn = this.createResizeBtn();
        return {
            imgEl,
            onSingleTap: () => ImageLightbox.show(imgBlob, imgTag),
            appendControls: (c) => c.append(deleteBtn, toggleBtn, resizeBtn)
        };
    }
    createToggleBtn() {
        const btn = createElement('button', 'slot-button');
        btn.textContent = 'Hide Image';
        btn.addEventListener('click', () => this.toggleImage());
        return btn;
    }
    createDeleteBtn() {
        const btn = createElement('button', 'slot-button'); // lazy with css
        btn.textContent = 'Delete Image';
        btn.addEventListener('click', () => this.deleteImage());
        return btn;
    }
    createResizeBtn() {
        const btn = createElement('button', 'slot-button');
        btn.textContent = 'Resize Image';
        btn.addEventListener('click', () => this.promptResize());
        return btn;
    }
    async promptResize() {
        const container = createElement('div', 'resize-prompt');
        const createInput = (value) => {
            const input = createElement('input');
            input.type = 'number';
            input.value = value.toString();
            input.min = '1';
            return input;
        };
        const widthInput = createInput(this.imgWrapper.offsetWidth);
        const heightInput = createInput(this.imgWrapper.offsetHeight);
        container.append(widthInput, heightInput);
        const confirmed = await popupConfirm(container, {
            title: 'Resize Image',
            okText: 'Apply'
        });
        if (!confirmed)
            return;
        const width = Number(widthInput.value);
        const height = Number(heightInput.value);
        if (!width || !height)
            return;
        await this.saveImageResize(width, height);
        this.panel.render();
    }
    async saveImageResize(width, height) {
        const tag = this.slot.activeImageTag;
        if (!tag)
            return;
        this.outfitView.resizeImage(this.slot.id, tag, width, height);
        this.outfitManager.saveSettings();
    }
    createImage(imageState) {
        const { tag, image, blob } = imageState;
        if (image.hidden) {
            this.imgWrapper.classList.add('--hidden');
            return { ok: false, reason: 'image-hidden' };
        }
        const imgEl = createElement('img', 'slot-image');
        imgEl.src = blob.base64;
        this.clampImage(image);
        imgEl.addEventListener('error', () => {
            this.imgWrapper.classList.add('--error');
        });
        const value = {
            imgEl,
            imgBlob: blob,
            imgRecord: image,
            imgTag: tag
        };
        return { ok: true, value };
    }
    createResizeHandle() {
        const handle = createElement('div', 'outfit-slot-image-resize-handle');
        // stop resizing from triggering clicks on the imgWrapper
        handle.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        handle.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            handle.setPointerCapture(e.pointerId);
            const startRect = this.imgWrapper.getBoundingClientRect();
            const startX = e.clientX;
            const startY = e.clientY;
            let width = startRect.width;
            let height = startRect.height;
            const onMove = (moveEvent) => {
                const dx = moveEvent.clientX - startX;
                const dy = moveEvent.clientY - startY;
                width = Math.max(24, startRect.width - dx);
                height = Math.max(24, startRect.height + dy);
                setElementSize(this.imgWrapper, width, height);
            };
            const onUp = () => {
                this.saveImageResize(width, height);
                handle.releasePointerCapture(e.pointerId);
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
            };
            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
        });
        return handle;
    }
    clampImage(image) {
        const scale = Math.min(this.boundaryWidth / image.width, 1);
        const newWidth = image.width * scale;
        const newHeight = image.height * scale;
        setElementSize(this.imgWrapper, newWidth, newHeight);
    }
    // add a new image or change to a pre-existing image
    // image tag must be kebab-case with no special characters
    // can be cancelled
    async changeImage() {
        const uploading = await popupConfirm('Will you be uploading a new image or choosing a stored image?', {
            okText: 'Upload',
            cancelText: 'Choose'
        });
        if (uploading) {
            this.uploadImage();
        }
        else {
            this.chooseImage();
        }
    }
    async uploadImage() {
        const file = await promptImageUpload();
        if (!file)
            return;
        const rawTag = prompt('Enter image tag (kebab-case only):');
        if (!rawTag)
            return;
        const tag = this.toKebabCase(rawTag);
        if (!tag) {
            toastr.error('Invalid tag format');
            return;
        }
        if (this.slot.hasImageState(tag)) {
            toastr.error('Tag already used.');
            return;
        }
        const { base64, height, width } = await resizeImage(file, 768);
        const key = await this.imagesView.addImage(base64, width, height);
        const slotId = this.slot.id;
        const added = this.outfitView.attachImage(slotId, tag, key);
        if (!added) {
            toastr.error('Failed to add image.');
            return;
        }
        this.outfitView.setActiveImage(slotId, tag);
        this.panel.saveAndRender();
    }
    async chooseImage() {
        const imageStates = this.slot.getImageStates();
        const tag = await this.promptImages(imageStates);
        if (tag === null)
            return;
        this.outfitView.setActiveImage(this.slot.id, tag);
        this.panel.saveAndRender();
    }
    async promptImages(imageStates) {
        return showImagePicker({
            imageStates,
            onDelete: async (tag) => {
                this.outfitView.deleteImage(this.slot.id, tag);
                this.outfitManager.saveSettings();
            }
        });
    }
    toBlob(image) {
        return this.imagesView.getImage(image.key);
    }
    toKebabCase(input) {
        const cleaned = input
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-');
        return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(cleaned)
            ? cleaned
            : null;
    }
    toggleImage() {
        const imageState = this.slot.getActiveImageState();
        if (!imageState)
            return;
        this.outfitView.toggleImage(this.slot.id, imageState.tag, !imageState.image.hidden);
        this.panel.saveAndRender();
    }
    // delete active image, setting active image key to null
    // requires double confirmation
    async deleteImage() {
        const key = this.slot.activeImageTag;
        if (!key)
            return;
        const confirm1 = await popupConfirm('Delete this image?');
        if (!confirm1)
            return;
        const confirm2 = await popupConfirm('This cannot be undone. Confirm?');
        if (!confirm2)
            return;
        const result = this.outfitView.deleteImage(this.slot.id, key);
        if (result.status === 'deleted-image') {
            this.imagesView.tryDeleteImage(result.blobKey);
        }
        else {
            toastr.error('Failed to delete image.');
            return;
        }
        toastr.success('Image deleted');
        this.panel.saveAndRender();
    }
}
