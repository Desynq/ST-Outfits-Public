import { OutfitTracker } from "../../data/tracker.js";
import { assertNever } from "../../shared.js";
import { popupConfirm } from "../../util/adapter/popup-adapter.js";
import { addDoubleTapListener } from "../../util/element/click-actions.js";
import { createElement, setElementSize } from "../../util/ElementHelper.js";
import { promptImageUpload, resizeImage } from "../../util/image-utils.js";
import { OutfitPanelContext } from "../base/OutfitPanelContext.js";
;
export class SlotImageComposer extends OutfitPanelContext {
    constructor(panel, slot, boundaryWidth) {
        super(panel);
        this.slot = slot;
        this.boundaryWidth = boundaryWidth;
    }
    static create(panel, slot, boundaryWidth) {
        const factory = new SlotImageComposer(panel, slot, boundaryWidth);
        return factory.build();
    }
    get imagesView() {
        return OutfitTracker.images();
    }
    /**
     * @invariant Does not mutate ctx DOM
     */
    build() {
        const imgWrapper = createElement('div', 'slot-image-wrapper');
        const tag = this.slot.activeImageTag;
        const { imgEl, onSingleTap, appendControls } = this.tryRenderImage(imgWrapper, tag);
        addDoubleTapListener(imgWrapper, () => this.changeImage(), 300, onSingleTap);
        return {
            imgWrapper,
            appendControls
        };
    }
    tryRenderImage(imgWrapper, tag) {
        if (!tag) {
            imgWrapper.classList.add('--empty');
            return { imgEl: null };
        }
        const result = this.createImage(imgWrapper, tag);
        if (!result.ok) {
            switch (result.reason) {
                case 'active-image-tag-not-stored':
                case 'image-blob-does-not-exist':
                    imgWrapper.classList.add('--error');
                    return { imgEl: null };
                case 'image-hidden':
                    imgWrapper.classList.add('--hidden');
                    imgWrapper.textContent = 'Show Image';
                    return {
                        imgEl: null,
                        onSingleTap: () => this.toggleImage()
                    };
                default: assertNever(result.reason);
            }
        }
        const { imgEl } = result.value;
        imgWrapper.append(imgEl);
        const resizeHandle = this.createResizeHandle(imgWrapper);
        imgWrapper.append(resizeHandle);
        const deleteBtn = this.createDeleteBtn();
        const toggleBtn = this.createToggleBtn();
        const resizeBtn = this.createResizeBtn(imgWrapper);
        return {
            imgEl,
            onSingleTap: () => this.showRawImage(result.value),
            appendControls: (c) => c.append(deleteBtn, toggleBtn, resizeBtn)
        };
    }
    async showRawImage(imgCtx) {
        const { imgBlob, imgTag } = imgCtx;
        const overlay = createElement('div', 'outfit-lightbox-overlay');
        const stage = createElement('div', 'outfit-lightbox-stage');
        const img = createElement('img', 'outfit-lightbox-image');
        img.src = imgBlob.base64;
        img.alt = imgTag;
        let zoomed = false;
        img.addEventListener('click', (e) => {
            e.stopPropagation();
            zoomed = !zoomed;
            if (zoomed) {
                const rect = img.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                img.style.transformOrigin = `${x}% ${y}%`;
                img.style.transform = `scale(2)`;
                img.style.cursor = 'zoom-out';
            }
            else {
                img.style.transform = 'scale(1)';
                img.style.transformOrigin = 'center center';
                img.style.cursor = 'zoom-in';
            }
        });
        overlay.addEventListener('click', () => {
            overlay.remove();
        });
        stage.append(img);
        overlay.append(stage);
        document.body.append(overlay);
        requestAnimationFrame(() => overlay.classList.add('show'));
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
    createResizeBtn(imgWrapper) {
        const btn = createElement('button', 'slot-button');
        btn.textContent = 'Resize Image';
        btn.addEventListener('click', () => this.promptResize(imgWrapper));
        return btn;
    }
    async promptResize(imgWrapper) {
        const container = createElement('div', 'resize-prompt');
        const createInput = (value) => {
            const input = createElement('input');
            input.type = 'number';
            input.value = value.toString();
            input.min = '1';
            return input;
        };
        const widthInput = createInput(imgWrapper.offsetWidth);
        const heightInput = createInput(imgWrapper.offsetHeight);
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
    createImage(imgWrapper, tag) {
        const imgRecord = this.slot.images[tag];
        if (!imgRecord)
            return { ok: false, reason: 'active-image-tag-not-stored' };
        if (imgRecord.hidden) {
            imgWrapper.classList.add('--hidden');
            return { ok: false, reason: 'image-hidden' };
        }
        const key = imgRecord.key;
        const imgBlob = this.imagesView.getImage(key);
        if (!imgBlob)
            return { ok: false, reason: 'image-blob-does-not-exist' };
        const imgEl = createElement('img', 'slot-image');
        imgEl.src = imgBlob.base64;
        this.clampImage(imgWrapper, imgRecord);
        imgEl.addEventListener('error', () => {
            imgWrapper.classList.add('--error');
        });
        const value = {
            imgEl,
            imgBlob,
            imgRecord,
            imgTag: tag
        };
        return { ok: true, value };
    }
    createResizeHandle(imgWrapper) {
        const handle = createElement('div', 'outfit-slot-image-resize-handle');
        // stop resizing from triggering clicks on the imgWrapper
        handle.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        handle.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            handle.setPointerCapture(e.pointerId);
            const startRect = imgWrapper.getBoundingClientRect();
            const startX = e.clientX;
            const startY = e.clientY;
            let width = startRect.width;
            let height = startRect.height;
            const onMove = (moveEvent) => {
                const dx = moveEvent.clientX - startX;
                const dy = moveEvent.clientY - startY;
                width = Math.max(24, startRect.width - dx);
                height = Math.max(24, startRect.height + dy);
                setElementSize(imgWrapper, width, height);
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
    clampImage(imgWrapper, image) {
        const scale = Math.min(this.boundaryWidth / image.width, 1);
        const newWidth = image.width * scale;
        const newHeight = image.height * scale;
        setElementSize(imgWrapper, newWidth, newHeight);
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
        if (this.slot.images[tag] !== undefined) {
            toastr.error('Tag already used');
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
        const images = this.slot.images;
        const tag = await this.promptImages(images);
        if (tag === null)
            return;
        const image = images[tag];
        const blob = this.toBlob(image);
        if (!blob) {
            console.error(`Image key ${image.key} from tag ${tag} does not point to an image blob`);
            return;
        }
        this.outfitView.setActiveImage(this.slot.id, tag);
        this.panel.saveAndRender();
    }
    async promptImages(images) {
        const container = createElement('div', 'image-picker');
        let selected = null;
        for (const [tag, image] of Object.entries(images)) {
            const blob = this.toBlob(image);
            if (!blob)
                continue;
            const wrapper = createElement('div', 'image-picker-item');
            const img = createElement('img');
            img.src = blob.base64;
            img.width = 96;
            img.height = Math.round(96 * (blob.height / blob.width));
            const label = createElement('div');
            label.textContent = tag;
            wrapper.appendChild(img);
            wrapper.appendChild(label);
            wrapper.onclick = () => {
                selected = tag;
                container.querySelectorAll('.selected')
                    .forEach(el => el.classList.remove('selected'));
                wrapper.classList.add('selected');
            };
            container.appendChild(wrapper);
        }
        const confirmed = await popupConfirm(container, {
            title: 'Choose Image',
            okText: 'Select',
            cancelText: 'Cancel',
            wide: true
        });
        if (!confirmed || !selected)
            return null;
        return selected;
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
        const tag = this.slot.activeImageTag;
        if (!tag)
            return;
        const image = this.slot.images[tag];
        if (!image)
            return;
        this.outfitView.toggleImage(this.slot.id, tag, !image.hidden);
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
