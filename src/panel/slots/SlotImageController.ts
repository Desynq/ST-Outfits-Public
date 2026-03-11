import { ImageBlob, ImageRef, OutfitImage } from "../../data/model/Outfit.js";
import { OutfitImageState } from "../../data/model/OutfitImageState.js";
import { OutfitSlotState } from "../../data/model/OutfitSnapshots.js";
import { OutfitTracker } from "../../data/tracker.js";
import { OutfitGalleryView } from "../../data/view/OutfitGalleryView.js";
import { assertNever } from "../../shared.js";
import { PanelType } from "../../types/maps.js";
import { ImageLightbox } from "../../ui/components/ImageLightbox.js";
import { popupConfirm } from "../../util/adapter/popup-adapter.js";
import { addDoubleTapListener } from "../../util/element/click-actions.js";
import { createElement, setElementSize } from "../../util/ElementHelper.js";
import { EventBus } from "../../util/EventBus.js";
import { promptImageUpload, resizeImage } from "../../util/image-utils.js";
import { OutfitPanelContext } from "../base/OutfitPanelContext.js";
import { OutfitPanel } from "../OutfitPanel.js";
import { showImagePicker } from "./prompt-images.js";


interface ImageContext {
	imgEl: HTMLImageElement;
	imgBlob: ImageRef;
	imgRecord: OutfitImage;
	imgTag: string;
};

type CreateImageFailReason =
	| 'active-image-tag-not-stored'
	| 'image-hidden'
	| 'image-blob-does-not-exist';

type CreateImageResult =
	| {
		ok: true;
		value: ImageContext;
	}
	| {
		ok: false;
		reason: CreateImageFailReason;
	};

type RenderImageBundle =
	| {
		imgEl: null;
		appendControls?: undefined;
		singleTap?: (e: PointerEvent) => void;
		noDoubleTap?: true;
		state: Exclude<ImageState, 'shown'>;
	}
	| {
		imgEl: HTMLImageElement;
		singleTap: (e: PointerEvent) => void;
		appendControls: (container: HTMLElement) => void;
		noDoubleTap?: never;
		state: Extract<ImageState, 'shown'>;
	};

export class SlotImageElementFactory extends OutfitPanelContext {

	public constructor(
		panel: OutfitPanel<PanelType>,
		private boundaryWidth: number
	) {
		super(panel);
	}

	public build(slot: OutfitSlotState): SlotImageElement {
		return new SlotImageElement(this.panel, this.boundaryWidth, slot);
	}
}

export type ImageState = 'shown' | 'hidden' | 'empty' | 'error';

export class SlotImageElement extends OutfitPanelContext {

	public readonly imgWrapper: HTMLDivElement;
	private _state: ImageState;

	private readonly doubleTapBus = new EventBus<() => void>();

	/**
	 * Shows a lightbox if the image is visible
	 */
	private singleTap: ((e: PointerEvent) => void) | undefined;
	private doubleTap: (() => void) | undefined;

	public readonly appendControlsTo?: ((parent: HTMLElement) => void) | undefined;

	public constructor(
		panel: OutfitPanel<PanelType>,
		private boundaryWidth: number,
		private slot: OutfitSlotState
	) {
		super(panel);
		this.imgWrapper = createElement('div', 'slot-image-wrapper');
		const imageState = this.slot.getActiveImageState();

		const { singleTap, appendControls, state } = this.renderImageContent(imageState);
		this._state = state;

		if (singleTap) {
			this.imgWrapper.addEventListener('click', singleTap);
			this.singleTap = singleTap;
		}

		this.appendControlsTo = appendControls;
	}

	public appendTo(parent: HTMLElement): this {
		parent.append(this.imgWrapper);
		return this;
	}

	public onDoubleTap(listener: () => void): this {
		this.doubleTapBus.add(listener);
		this.ensureDoubleTap();

		return this;
	}




	private ensureDoubleTap(): void {
		if (this.doubleTap) return;

		if (this.singleTap) {
			this.imgWrapper.removeEventListener('click', this.singleTap);
		}

		this.doubleTap = addDoubleTapListener(
			this.imgWrapper,
			() => this.doubleTapBus.emit(),
			300,
			this.singleTap
		);
	}

	/**
	 * @throws if there's no shown image to observe
	 */
	public observe(flexParent: HTMLElement): { disconnect: () => void; } {
		if (this._state !== 'shown') {
			throw new Error('No shown image to observe');
		}

		const updateLayout = () => {
			const imageRect = this.imgWrapper.getBoundingClientRect();
			const containerRect = flexParent.getBoundingClientRect();

			const widthRatio = imageRect.width / containerRect.width;
			const heightRatio = imageRect.height / (containerRect.height);

			const imageWider = widthRatio > 0.4;
			const imageShort = heightRatio < 0.8;

			flexParent.classList.toggle('--image-wider', imageWider);
			flexParent.classList.toggle('--value-taller', imageShort);
		};

		const observer = new ResizeObserver(() => {
			updateLayout();
		});

		observer.observe(this.imgWrapper);
		observer.observe(flexParent);

		updateLayout();

		return {
			disconnect: () => observer.disconnect()
		};
	}

	private get imagesView(): OutfitGalleryView {
		return OutfitTracker.viewGallery();
	}

	public get state(): ImageState {
		return this._state;
	}

	private renderImageContent(imageState: OutfitImageState | null): RenderImageBundle {
		if (!imageState) {
			this.imgWrapper.classList.add('--empty');
			this.imgWrapper.textContent = 'Add Image';
			return {
				imgEl: null,
				noDoubleTap: true,
				singleTap: () => this.changeImage(),
				state: 'empty'
			};
		}

		const result = this.createImage(imageState);
		if (!result.ok) {
			switch (result.reason) {
				case 'active-image-tag-not-stored':
				case 'image-blob-does-not-exist':
					this.imgWrapper.classList.add('--error');
					this.imgWrapper.textContent = 'Error';
					return {
						imgEl: null,
						state: 'error'
					};
				case 'image-hidden':
					this.imgWrapper.classList.add('--hidden');
					this.imgWrapper.textContent = 'Show Image';
					return {
						imgEl: null,
						singleTap: () => this.toggleImage(),
						state: 'hidden'
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
			singleTap: () => ImageLightbox.show(imgBlob, imgTag),
			appendControls: (c: HTMLElement) => c.append(deleteBtn, toggleBtn, resizeBtn),
			state: 'shown'
		};
	}

	private createToggleBtn(): HTMLButtonElement {
		const btn = createElement('button', 'slot-button');
		btn.textContent = 'Hide Image';

		btn.addEventListener('click', () => this.toggleImage());

		return btn;
	}

	private createDeleteBtn(): HTMLButtonElement {
		const btn = createElement('button', 'slot-button'); // lazy with css
		btn.textContent = 'Delete Image';

		btn.addEventListener('click', () => this.deleteImage());

		return btn;
	}

	private createResizeBtn(): HTMLButtonElement {
		const btn = createElement('button', 'slot-button');
		btn.textContent = 'Resize Image';

		btn.addEventListener('click', () => this.promptResize());

		return btn;
	}

	private async promptResize(): Promise<void> {
		const container = createElement('div', 'resize-prompt');

		const createInput = (value: number) => {
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

		if (!confirmed) return;

		const width = Number(widthInput.value);
		const height = Number(heightInput.value);

		if (!width || !height) return;

		await this.saveImageResize(width, height);
		this.panel.renderTabsAndActiveContent();
	}



	private async saveImageResize(width: number, height: number): Promise<void> {
		const tag = this.slot.activeImageTag;
		if (!tag) return;

		this.outfitView.resizeImage(this.slot.id, tag, width, height);
		this.outfitManager.saveSettings();
	}

	private createImage(imageState: OutfitImageState): CreateImageResult {
		const { tag, image, ref: blob } = imageState;
		if (image.hidden) {
			this.imgWrapper.classList.add('--hidden');
			return { ok: false, reason: 'image-hidden' };
		}


		const imgEl = createElement('img', 'slot-image');

		imgEl.src = blob.url;
		this.clampImage(image);

		imgEl.addEventListener('error', () => {
			this.imgWrapper.classList.add('--error');
		});

		const value: ImageContext = {
			imgEl,
			imgBlob: blob,
			imgRecord: image,
			imgTag: tag
		};
		return { ok: true, value };
	}

	private createResizeHandle(): HTMLDivElement {
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

			const onMove = (moveEvent: PointerEvent) => {
				const dx = moveEvent.clientX - startX;
				const dy = moveEvent.clientY - startY;

				width = Math.max(24, startRect.width + dx);
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

	private clampImage(image: OutfitImage): void {
		const maxWidth = this.boundaryWidth / 2;
		const scale = Math.min(maxWidth / image.width, 1);
		const newWidth = image.width * scale;
		const newHeight = image.height * scale;

		setElementSize(this.imgWrapper, newWidth, newHeight);
	}

	// add a new image or change to a pre-existing image
	// image tag must be kebab-case with no special characters
	// can be cancelled
	public async changeImage(): Promise<void> {
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

	private async uploadImage(): Promise<void> {
		const file = await promptImageUpload();
		if (!file) return;

		const rawTag = prompt('Enter image tag (kebab-case only):');
		if (!rawTag) return;

		const tag = this.toKebabCase(rawTag);

		if (!tag) {
			toastr.error('Invalid tag format');
			return;
		}

		if (this.slot.hasImageState(tag)) {
			toastr.error('Tag already used.');
			return;
		}

		const { base64, height, width } = await resizeImage(file, 2048);
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

	private async chooseImage(): Promise<void> {
		const imageStates = this.slot.getImageStates();

		const tag = await this.promptImages(imageStates);
		if (tag === null) return;

		this.outfitView.setActiveImage(this.slot.id, tag);

		this.panel.saveAndRender();
	}

	private async promptImages(imageStates: OutfitImageState[]): Promise<string | null> {
		return showImagePicker({
			imageStates,
			onDelete: async (tag) => {
				this.outfitView.deleteImage(this.slot.id, tag);
				this.outfitManager.saveSettings();
			}
		});
	}

	private toKebabCase(input: string): string | null {
		const cleaned = input
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9\s-]/g, '')
			.replace(/\s+/g, '-');

		return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(cleaned)
			? cleaned
			: null;
	}

	private toggleImage() {
		const imageState = this.slot.getActiveImageState();
		if (!imageState) return;

		this.outfitView.toggleImage(this.slot.id, imageState.tag, !imageState.image.hidden);

		this.panel.saveAndRender();
	}

	// delete active image, setting active image key to null
	// requires double confirmation
	private async deleteImage() {
		const key = this.slot.activeImageTag;

		if (!key) return;

		const confirm1 = await popupConfirm('Delete this image?');
		if (!confirm1) return;

		const confirm2 = await popupConfirm('This cannot be undone. Confirm?');
		if (!confirm2) return;

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