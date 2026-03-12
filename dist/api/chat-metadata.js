import { normalizeOutfit } from "../data/normalize.js";
const { saveMetadataDebounced } = SillyTavern.getContext();
function fetchChatMetadata() {
    return SillyTavern.getContext().chatMetadata;
}
export function readOutfit() {
    const metadata = fetchChatMetadata();
    const raw = metadata[CURRENT_OUTFIT_KEY];
    if (raw === undefined) {
        return undefined;
    }
    const outfit = normalizeOutfit(raw);
    return outfit;
}
const CURRENT_OUTFIT_KEY = 'st-outfit.current-outfit';
class _ChatOutfitStorage {
    loadAutosave() {
        const raw = fetchChatMetadata()[CURRENT_OUTFIT_KEY];
        if (!raw || typeof raw !== 'object') {
            return { outfits: {} };
        }
        return {
            outfits: Object.fromEntries(Object.entries(raw.outfits ?? {})
                .map(([k, v]) => [k, normalizeOutfit(v)]))
        };
    }
    loadInto(settingsOutfit, id) {
        const autosave = this.loadAutosave();
        const stored = autosave.outfits[id];
        if (!stored)
            return;
        settingsOutfit.slots = structuredClone(stored.slots);
    }
    saveFrom(settingsOutfit, id) {
        const metadata = fetchChatMetadata();
        const autosave = this.loadAutosave();
        autosave.outfits[id] = structuredClone(settingsOutfit);
        metadata[CURRENT_OUTFIT_KEY] = autosave;
        saveMetadataDebounced();
    }
}
export const ChatOutfitStorage = new _ChatOutfitStorage();
