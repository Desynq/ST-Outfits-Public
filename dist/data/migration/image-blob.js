import { saveBase64AsFile } from "../../api/media-fs";
import { OutfitTracker } from "../tracker";
export async function migrateLegacyImages() {
    const model = OutfitTracker;
    const images = model.images;
    let migrated = false;
    for (const [key, blob] of Object.entries(images)) {
        if (!blob || typeof blob !== "object")
            continue;
        if (!("base64" in blob))
            continue;
        const base64 = blob.base64;
        const raw = base64.split(",")[1];
        const ext = extractExtension(base64);
        const url = await saveBase64AsFile(raw, "outfits", key, ext);
        images[key] = {
            url,
            width: blob.width,
            height: blob.height
        };
        migrated = true;
    }
    if (migrated) {
        saveSettingsDebounced();
    }
}
function extractExtension(base64) {
    const match = /^data:image\/([^;]+);base64/.exec(base64);
    return match?.[1] ?? "png";
}
