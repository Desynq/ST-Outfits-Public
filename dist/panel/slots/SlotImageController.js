import { OutfitTracker } from "../../data/tracker.js";
import { popupConfirm } from "../../util/adapter/popup-adapter.js";
import { addDoubleTapListener } from "../../util/element/click-actions.js";
import { createElement, onResizeElement } from "../../util/ElementHelper.js";
import { promptImageUpload, resizeImage } from "../../util/image-utils.js";
import { OutfitPanelContext } from "../base/OutfitPanelContext.js";
export class SlotImageController extends OutfitPanelContext {
    get imagesView() {
        return OutfitTracker.images();
    }
    /**
     * @invariant Does not mutate ctx DOM
     */
    create(ctx) {
        const imgWrapper = createElement('div', 'slot-image-wrapper');
        const tag = ctx.slot.activeImageTag;
        let imgEl = null;
        let showImage;
        if (!tag) {
            imgWrapper.classList.add('--empty');
        }
        else {
            imgEl = this.createImage(imgWrapper, ctx, tag);
            if (imgEl) {
                imgWrapper.append(imgEl);
                const deleteBtn = this.createDeleteBtn(ctx);
                const toggleBtn = this.createToggleBtn(ctx);
                const resizeBtn = this.createResizeBtn(imgWrapper, ctx);
                ctx.labelLeftDiv.append(deleteBtn, toggleBtn, resizeBtn);
            }
            else {
                if (imgWrapper.classList.contains('--hidden')) {
                    imgWrapper.textContent = 'Show Image';
                    showImage = () => this.toggleImage(ctx);
                }
            }
        }
        addDoubleTapListener(imgWrapper, () => this.changeImage(ctx), 300, showImage);
        return {
            imgWrapper,
            imgEl
        };
    }
    createToggleBtn(ctx) {
        const btn = createElement('button', 'slot-button');
        btn.textContent = 'Hide Image';
        btn.addEventListener('click', () => this.toggleImage(ctx));
        return btn;
    }
    createDeleteBtn(ctx) {
        const btn = createElement('button', 'slot-button'); // lazy with css
        btn.textContent = 'Delete Image';
        btn.addEventListener('click', () => this.deleteImage(ctx));
        return btn;
    }
    createResizeBtn(imgWrapper, ctx) {
        const btn = createElement('button', 'slot-button');
        btn.textContent = 'Resize Image';
        btn.addEventListener('click', () => this.promptResize(imgWrapper, ctx));
        return btn;
    }
    async promptResize(imgWrapper, ctx) {
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
        await this.saveImageResize(ctx, width, height);
        this.panel.render();
    }
    async saveImageResize(ctx, width, height) {
        const tag = ctx.slot.activeImageTag;
        if (!tag)
            return;
        this.outfitView.resizeImage(ctx.slot.id, tag, width, height);
        this.outfitManager.saveSettings();
    }
    createImage(imgWrapper, ctx, tag) {
        const displayError = (message) => {
            imgWrapper.classList.add('--error');
            console.error(message);
            return null;
        };
        const image = ctx.slot.images[tag];
        if (!image)
            return displayError(`Active image tag '${tag}' is not stored`);
        if (image.hidden) {
            imgWrapper.classList.add('--hidden');
            return null;
        }
        const key = image.key;
        const blob = this.imagesView.getImage(key);
        if (!blob)
            return displayError(`Blob key '${key}' from image tag '${tag}' does not point to an image blob`);
        const imgEl = createElement('img', 'slot-image');
        imgEl.src = blob.base64;
        for (const x of ['width', 'height'])
            imgWrapper.style[x] = `${image[x]}px`;
        imgEl.addEventListener('error', () => {
            imgWrapper.classList.add('--error');
        });
        this.panel.disposer.add(onResizeElement(imgWrapper, (width, height) => this.saveImageResize(ctx, width, height)));
        return imgEl;
    }
    // add a new image or change to a pre-existing image
    // image tag must be kebab-case with no special characters
    // can be cancelled
    async changeImage(ctx) {
        const uploading = await popupConfirm('Will you be uploading a new image or choosing a stored image?', {
            okText: 'Upload',
            cancelText: 'Choose'
        });
        if (uploading) {
            this.uploadImage(ctx);
        }
        else {
            this.chooseImage(ctx);
        }
    }
    async uploadImage(ctx) {
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
        if (ctx.slot.images[tag] !== undefined) {
            toastr.error('Tag already used');
            return;
        }
        const { base64, height, width } = await resizeImage(file, 768);
        const key = await this.imagesView.addImage(base64, width, height);
        const slotId = ctx.slot.id;
        const added = this.outfitView.attachImage(slotId, tag, key);
        if (!added) {
            toastr.error('Failed to add image.');
            return;
        }
        this.outfitView.setActiveImage(slotId, tag);
        this.panel.saveAndRender();
    }
    async chooseImage(ctx) {
        const images = ctx.slot.images;
        const tag = await this.promptImages(images);
        if (tag === null)
            return;
        const image = images[tag];
        const blob = this.toBlob(image);
        if (!blob) {
            console.error(`Image key ${image.key} from tag ${tag} does not point to an image blob`);
            return;
        }
        this.outfitView.setActiveImage(ctx.slot.id, tag);
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
    toggleImage(ctx) {
        const slot = ctx.slot;
        const tag = slot.activeImageTag;
        if (!tag)
            return;
        const image = slot.images[tag];
        if (!image)
            return;
        this.outfitView.toggleImage(ctx.slot.id, tag, !image.hidden);
        this.panel.saveAndRender();
    }
    // delete active image, setting active image key to null
    // requires double confirmation
    async deleteImage(ctx) {
        const slot = ctx.slot;
        const key = slot.activeImageTag;
        if (!key)
            return;
        const confirm1 = await popupConfirm('Delete this image?');
        if (!confirm1)
            return;
        const confirm2 = await popupConfirm('This cannot be undone. Confirm?');
        if (!confirm2)
            return;
        const result = this.outfitView.deleteImage(slot.id, key);
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
