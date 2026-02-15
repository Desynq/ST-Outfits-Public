import { ImageBlob } from "../model/Outfit.js";
import { OutfitTracker } from "../tracker.js";
import { OutfitView } from "./OutfitView.js";


async function hashBase64(base64: string): Promise<string> {
	const bytes = Uint8Array.from(
		atob(base64.split(',')[1]),
		c => c.charCodeAt(0)
	);
	const digest = await crypto.subtle.digest('SHA-256', bytes);
	return Array.from(new Uint8Array(digest))
		.map(b => b.toString(16).padStart(2, '0'))
		.join('');
}

export class OutfitImagesView {
	public constructor(
		protected images: Record<string, ImageBlob>
	) { }

	public getImage(key: string): ImageBlob | undefined {
		return this.images[key];
	}

	public async addImage(base64: string, width: number, height: number): Promise<string> {
		const id = await hashBase64(base64);

		if (!this.images[id]) {
			this.images[id] = {
				base64,
				width,
				height
			};
		}

		return id;
	}

	/**
	 * Garbage collection, what's that?
	 */
	public async tryDeleteImage(key: string): Promise<boolean> {
		if (this.images[key] === undefined) return false;

		if (this.isImageReferenced(key)) return false;

		return this.deleteImage(key);
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
		userOutfits.push(uocv.getOrCreateAutosaved());
		for (const outfit of userOutfits) {
			if (hasImageRef(outfit)) return true;
		}

		const comv = OutfitTracker.characters();
		const cocs = comv.characters().map(character => comv.outfits(character));
		for (const cocv of cocs) {
			const charOutfits = cocv.getSavedOutfitNames().map(name => cocv.getSavedOutfit(name)!);
			charOutfits.push(cocv.getOrCreateAutosaved());
			for (const outfit of charOutfits) {
				if (hasImageRef(outfit)) return true;
			}
		}

		return false;
	}

	private deleteImage(key: string): boolean {
		return delete this.images[key];
	}
}