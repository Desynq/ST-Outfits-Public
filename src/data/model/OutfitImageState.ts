import { ImageBlob, OutfitImage } from "./Outfit.js";



export class OutfitImageState {

	public constructor(
		public readonly tag: string,
		public readonly image: OutfitImage,
		public readonly blob: ImageBlob
	) { }
}