import { ImageBlob, OutfitImage } from "../../data/model/Outfit.js";
import { ResolvedOutfitSlot } from "../../data/model/OutfitSnapshots.js";
import { OutfitTracker } from "../../data/tracker.js";
import { OutfitImagesView } from "../../data/view/OutfitImagesView.js";
import { assertNever } from "../../shared.js";
import { PanelType } from "../../types/maps.js";
import { popupConfirm } from "../../util/adapter/popup-adapter.js";
import { addDoubleTapListener } from "../../util/element/click-actions.js";
import { addLongPressAction, appendElement, createElement, hasAnyClass, onResizeElement, setElementSize } from "../../util/ElementHelper.js";
import { promptImageUpload, resizeImage } from "../../util/image-utils.js";
import { OutfitPanelContext } from "../base/OutfitPanelContext.js";
import { OutfitPanel } from "../OutfitPanel.js";
import { SlotContext } from "./SlotRenderer.js";


interface ImageContext {
	imgEl: HTMLImageElement;
	imgBlob: ImageBlob;
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
		onSingleTap?: (e: PointerEvent) => void;
		appendControls?: undefined;
	}
	| {
		imgEl: HTMLImageElement;
		onSingleTap: (e: PointerEvent) => void;
		appendControls: (container: HTMLElement) => void;
	};

type BuildResult = {
	imgWrapper: HTMLDivElement;
	appendControls?: ((container: HTMLElement) => void) | undefined;
};



export class SlotImageComposer extends OutfitPanelContext {

	private constructor(
		panel: OutfitPanel<PanelType>,
		private slot: ResolvedOutfitSlot,
		private boundaryWidth: number
	) {
		super(panel);
	}

	public static create(
		panel: OutfitPanel<PanelType>,
		slot: ResolvedOutfitSlot,
		boundaryWidth: number
	): BuildResult {
		const factory = new SlotImageComposer(panel, slot, boundaryWidth);
		return factory.build();
	}

	private get imagesView(): OutfitImagesView {
		return OutfitTracker.images();
	}

	/**
	 * @invariant Does not mutate ctx DOM
	 */
	public build(): BuildResult {
		const imgWrapper = createElement('div', 'slot-image-wrapper');

		const tag = this.slot.activeImageTag;
		const { imgEl, onSingleTap, appendControls } = this.tryRenderImage(imgWrapper, tag);


		addDoubleTapListener(
			imgWrapper,
			() => this.changeImage(),
			300,
			onSingleTap
		);

		return {
			imgWrapper,
			appendControls
		};
	}

	private tryRenderImage(
		imgWrapper: HTMLDivElement,
		tag: string | null
	): RenderImageBundle {
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
			appendControls: (c: HTMLElement) => c.append(deleteBtn, toggleBtn, resizeBtn)
		};
	}

	private async showRawImage(imgCtx: ImageContext) {
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
			} else {
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

	private createResizeBtn(imgWrapper: HTMLDivElement): HTMLButtonElement {
		const btn = createElement('button', 'slot-button');
		btn.textContent = 'Resize Image';

		btn.addEventListener('click', () => this.promptResize(imgWrapper));

		return btn;
	}

	private async promptResize(imgWrapper: HTMLDivElement): Promise<void> {
		const container = createElement('div', 'resize-prompt');

		const createInput = (value: number) => {
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

		if (!confirmed) return;

		const width = Number(widthInput.value);
		const height = Number(heightInput.value);

		if (!width || !height) return;

		await this.saveImageResize(width, height);
		this.panel.render();
	}



	private async saveImageResize(width: number, height: number): Promise<void> {
		const tag = this.slot.activeImageTag;
		if (!tag) return;

		this.outfitView.resizeImage(this.slot.id, tag, width, height);
		this.outfitManager.saveSettings();
	}

	private createImage(
		imgWrapper: HTMLDivElement,
		tag: string,
	): CreateImageResult {

		const imgRecord = this.slot.images[tag];
		if (!imgRecord) return { ok: false, reason: 'active-image-tag-not-stored' };

		if (imgRecord.hidden) {
			imgWrapper.classList.add('--hidden');
			return { ok: false, reason: 'image-hidden' };
		}

		const key = imgRecord.key;
		const imgBlob = this.imagesView.getImage(key);
		if (!imgBlob) return { ok: false, reason: 'image-blob-does-not-exist' };


		const imgEl = createElement('img', 'slot-image');

		imgEl.src = imgBlob.base64;
		this.clampImage(imgWrapper, imgRecord);

		imgEl.addEventListener('error', () => {
			imgWrapper.classList.add('--error');
		});

		const value: ImageContext = {
			imgEl,
			imgBlob,
			imgRecord,
			imgTag: tag
		};
		return { ok: true, value };
	}

	private createResizeHandle(imgWrapper: HTMLDivElement): HTMLDivElement {
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

			const onMove = (moveEvent: PointerEvent) => {
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

	private clampImage(imgWrapper: HTMLDivElement, image: OutfitImage): void {
		const scale = Math.min(this.boundaryWidth / image.width, 1);
		const newWidth = image.width * scale;
		const newHeight = image.height * scale;

		setElementSize(imgWrapper, newWidth, newHeight);
	}

	// add a new image or change to a pre-existing image
	// image tag must be kebab-case with no special characters
	// can be cancelled
	private async changeImage() {
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

	private async chooseImage(): Promise<void> {
		const images = this.slot.images;

		const tag = await this.promptImages(images);
		if (tag === null) return;

		const image = images[tag];

		const blob = this.toBlob(image);
		if (!blob) {
			console.error(`Image key ${image.key} from tag ${tag} does not point to an image blob`);
			return;
		}

		this.outfitView.setActiveImage(this.slot.id, tag);

		this.panel.saveAndRender();
	}

	private async promptImages(images: Record<string, OutfitImage>): Promise<string | null> {
		const container = createElement('div', 'image-picker');

		let selected: string | null = null;

		for (const [tag, image] of Object.entries(images)) {
			const blob = this.toBlob(image);
			if (!blob) continue;

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

		if (!confirmed || !selected) return null;

		return selected;
	}

	private toBlob(image: OutfitImage): ImageBlob | undefined {
		return this.imagesView.getImage(image.key);
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
		const tag = this.slot.activeImageTag;

		if (!tag) return;

		const image = this.slot.images[tag];
		if (!image) return;

		this.outfitView.toggleImage(this.slot.id, tag, !image.hidden);

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