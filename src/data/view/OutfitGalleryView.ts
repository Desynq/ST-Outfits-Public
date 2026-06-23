import { deleteMediaFromServer, saveBase64AsFile } from "../../api/media-fs.js";
import { extensionFromBase64, fetchBase64, hashBase64 } from "../../util/image-utils.js";
import { ImageBlob, ImageCacheEntry, ImageRef } from "../model/Outfit.js";
import { ImageRegistry } from "../model/OutfitGallery.js";
import { OutfitTracker } from "../tracker.js";
import { OutfitView } from "./OutfitView.js";



export class OutfitGalleryView implements ImageRegistry {

	public constructor(
		private readonly refs: Record<string, ImageRef>,
		private readonly cache: Map<string, ImageCacheEntry>,
		private readonly folder: string
	) { }

	public async getImageBlob(key: string): Promise<ImageBlob | undefined> {
		const cached = this.cache.get(key);
		if (cached) return cached;

		const ref = this.refs[key];

		const base64 = await fetchBase64(ref.url);

		const blob = {
			base64,
			width: ref.width,
			height: ref.height
		};

		this.cache.set(key, blob);

		return blob;
	}

	public getImageRef(key: string): ImageRef | undefined {
		const ref = this.refs[key];
		return ref ? { ...ref } : undefined;
	}

	public async addImage(base64: string, width: number, height: number, overwrite = false): Promise<string> {
		const id = await hashBase64(base64);

		if (this.refs[id] && !overwrite) {
			return id;
		}

		const extension = extensionFromBase64(base64);
		if (extension === undefined) {
			throw new Error('base64 has an undefined extension');
		}

		// strip the prefix: data:image/png;base64,
		const rawBase64 = base64.split(',')[1];

		const url = await saveBase64AsFile(
			rawBase64,
			this.folder,
			id,
			extension
		);

		this.refs[id] = {
			url,
			width,
			height
		};

		return id;
	}

	public async tryDeleteImage(key: string): Promise<boolean> {
		const image = this.refs[key];
		if (!image) return false;

		if (this.isImageReferenced(key)) return false;

		const deleted = await deleteMediaFromServer(image.url, false);

		if (deleted) {
			delete this.refs[key];
		}

		return deleted;
	}

	private isImageReferenced(key: string): boolean {
		const hasImageRef = (outfit: OutfitView): boolean => {
			for (const slot of outfit.slots) {
				for (const image of Object.values(slot.images)) {
					if (image.key === key) return true;
				}
			}
			return false;
		};

		const uocv = OutfitTracker.userOutfits();
		const userOutfits = uocv.getOutfitNames().map(name => uocv.getSavedOutfit(name)!);
		userOutfits.push(uocv.getOrCreateCurrentOutfit());

		for (const outfit of userOutfits) {
			if (hasImageRef(outfit)) return true;
		}

		const comv = OutfitTracker.characters();
		const cocs = comv.characters().map(character => comv.outfits(character));

		for (const cocv of cocs) {
			const charOutfits = cocv.getSavedOutfitNames().map(name => cocv.getSavedOutfit(name)!);
			charOutfits.push(cocv.getOrCreateCurrentOutfit());

			for (const outfit of charOutfits) {
				if (hasImageRef(outfit)) return true;
			}
		}

		return false;
	}
}