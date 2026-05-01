import { ImageBlob, ImageRef, OutfitImage } from "./Outfit.js";



export class OutfitImageState {

	public constructor(
		public readonly tag: string,
		public readonly image: Readonly<OutfitImage>,
		public readonly ref: Readonly<ImageRef>
	) {
		if (ref.width <= 0 || ref.height <= 0) {
			throw new Error('Invalid reference image width or height. Must be greater than 0.');
		}
		if (image.width <= 0 || image.height <= 0) {
			throw new Error('Invalid image width or height. Must be greater than 0.');
		}
	}

	public getNativeAspectRatio(): number {
		return this.ref.width / this.ref.height;
	}
}