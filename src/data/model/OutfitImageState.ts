import { ImageBlob, ImageRef, OutfitImage } from "./Outfit.js";



export class OutfitImageState {

	public constructor(
		public readonly tag: string,
		public readonly image: OutfitImage,
		public readonly ref: ImageRef
	) { }
}