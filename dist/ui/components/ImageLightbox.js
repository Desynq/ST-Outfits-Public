import { createElement } from "../../util/ElementHelper.js";
export class ImageLightbox {
    constructor(imgBlob, tag) {
        this.imgBlob = imgBlob;
        this.tag = tag;
        this.zoomed = false;
        this.overlay = createElement('div', 'outfit-lightbox-overlay');
        this.stage = createElement('div', 'outfit-lightbox-stage');
        this.img = createElement('img', 'outfit-lightbox-image');
        this.img.src = this.imgBlob.base64;
        this.img.alt = this.tag;
        this.img.addEventListener('click', (e) => this.onImgClick(e));
        this.overlay.addEventListener('click', () => this.close());
        this.stage.append(this.img);
        this.overlay.append(this.stage);
    }
    static show(blob, tag) {
        const instance = new ImageLightbox(blob, tag);
        instance.append(document.body);
    }
    append(container) {
        container.append(this.overlay);
        requestAnimationFrame(() => this.overlay.classList.add('show'));
    }
    close() {
        this.overlay.remove();
    }
    onImgClick(e) {
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
