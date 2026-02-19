import { ImageBlob } from "../../data/model/Outfit.js";
import { createElement } from "../../util/ElementHelper.js";


export class ImageLightbox {

	private readonly overlay: HTMLDivElement;
	private readonly stage: HTMLDivElement;
	private readonly img: HTMLImageElement;

	private zoomed: boolean = false;

	private constructor(
		private imgBlob: ImageBlob,
		private tag: string
	) {
		this.overlay = createElement('div', 'sto-overlay');
		this.stage = createElement('div', 'outfit-lightbox-stage');

		this.img = createElement('img', 'outfit-lightbox-image');
		this.img.src = this.imgBlob.base64;
		this.img.alt = this.tag;
		this.img.addEventListener('click', (e) => this.onImgClick(e));

		this.overlay.addEventListener('click', () => this.close());

		this.stage.append(this.img);
		this.overlay.append(this.stage);
	}

	public static show(blob: ImageBlob, tag: string): void {
		const instance = new ImageLightbox(blob, tag);
		instance.append(document.body);
	}

	public append(container: HTMLElement): void {
		container.append(this.overlay);
		requestAnimationFrame(() => this.overlay.classList.add('show'));
	}

	private close(): void {
		this.overlay.remove();
	}

	private onImgClick(e: MouseEvent): void {
		e.stopPropagation();

		this.zoomed = !this.zoomed;
		const imgStyle = this.img.style;

		if (this.zoomed) {
			const rect = this.img.getBoundingClientRect();

			const x = ((e.clientX - rect.left) / rect.width) * 100;
			const y = ((e.clientY - rect.top) / rect.height) * 100;

			imgStyle.transformOrigin = `${x}% ${y}%`;
			imgStyle.transform = `scale(2)`;
			imgStyle.cursor = `zoom-out`;
		}
		else {
			imgStyle.transformOrigin = `center center`;
			imgStyle.transform = `scale(1)`;
			imgStyle.cursor = 'zoom-in';
		}
	}
}