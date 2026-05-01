export class OutfitImageState {
    constructor(tag, image, ref) {
        this.tag = tag;
        this.image = image;
        this.ref = ref;
        if (ref.width <= 0 || ref.height <= 0) {
            throw new Error('Invalid reference image width or height. Must be greater than 0.');
        }
        if (image.width <= 0 || image.height <= 0) {
            throw new Error('Invalid image width or height. Must be greater than 0.');
        }
    }
    getNativeAspectRatio() {
        return this.ref.width / this.ref.height;
    }
}
