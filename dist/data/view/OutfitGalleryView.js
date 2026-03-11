import { deleteMediaFromServer, saveBase64AsFile } from "../../api/media-fs.js";
import { extensionFromBase64, fetchBase64, hashBase64 } from "../../util/image-utils.js";
import { OutfitTracker } from "../tracker.js";
export class OutfitGalleryView {
    constructor(refs, cache, folder) {
        this.refs = refs;
        this.cache = cache;
        this.folder = folder;
    }
    async getImageBlob(key) {
        const cached = this.cache.get(key);
        if (cached)
            return cached;
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
    getImageRef(key) {
        const ref = this.refs[key];
        return ref ? { ...ref } : undefined;
    }
    async addImage(base64, width, height, overwrite = false) {
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
        const url = await saveBase64AsFile(rawBase64, this.folder, id, extension);
        this.refs[id] = {
            url,
            width,
            height
        };
        return id;
    }
    async tryDeleteImage(key) {
        const image = this.refs[key];
        if (!image)
            return false;
        if (this.isImageReferenced(key))
            return false;
        const deleted = await deleteMediaFromServer(image.url, false);
        if (deleted) {
            delete this.refs[key];
        }
        return deleted;
    }
    isImageReferenced(key) {
        const hasImageRef = (outfit) => {
            for (const slot of outfit.slots) {
                for (const image of Object.values(slot.images)) {
                    if (image.key === key)
                        return true;
                }
            }
            return false;
        };
        const uocv = OutfitTracker.userOutfits();
        const userOutfits = uocv.getOutfitNames().map(name => uocv.getSavedOutfit(name));
        userOutfits.push(uocv.getOrCreateAutosaved());
        for (const outfit of userOutfits) {
            if (hasImageRef(outfit))
                return true;
        }
        const comv = OutfitTracker.characters();
        const cocs = comv.characters().map(character => comv.outfits(character));
        for (const cocv of cocs) {
            const charOutfits = cocv.getSavedOutfitNames().map(name => cocv.getSavedOutfit(name));
            charOutfits.push(cocv.getOrCreateAutosaved());
            for (const outfit of charOutfits) {
                if (hasImageRef(outfit))
                    return true;
            }
        }
        return false;
    }
}
