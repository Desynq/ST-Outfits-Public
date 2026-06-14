import { normalizeOutfit } from "../data/normalize.js";
import { isRecordOf } from "../util/narrowing.js";
const { saveMetadataDebounced } = SillyTavern.getContext();
function fetchChatMetadata() {
    return SillyTavern.getContext().chatMetadata;
}
export function readOutfit() {
    const metadata = fetchChatMetadata();
    const raw = metadata[NAMESPACE_KEY];
    if (raw === undefined) {
        return undefined;
    }
    const outfit = normalizeOutfit(raw);
    return outfit;
}
const NAMESPACE_KEY = 'st-outfit.current-outfit';
class _ChatOutfitStorage {
    /**
     * @returns copy of chat meta data; changes must be saved
     */
    getChatData() {
        const raw = fetchChatMetadata()[NAMESPACE_KEY];
        if (!raw || typeof raw !== 'object') {
            return { outfits: {}, addendums: {} };
        }
        return {
            outfits: Object.fromEntries(Object.entries(raw.outfits ?? {})
                .map(([k, v]) => [k, normalizeOutfit(v)])),
            addendums: isRecordOf(raw.addendums, slots => isRecordOf(slots, v => typeof v === 'string'))
                ? raw.addendums
                : {}
        };
    }
    saveChatData(data) {
        const metadata = fetchChatMetadata();
        metadata[NAMESPACE_KEY] = data;
        saveMetadataDebounced();
    }
    loadOutfitInto(settingsOutfit, character) {
        const autosave = this.getChatData();
        const stored = autosave.outfits[character];
        if (!stored)
            return;
        settingsOutfit.slots = structuredClone(stored.slots);
    }
    saveOutfitToChat(settingsOutfit, character) {
        const data = this.getChatData();
        data.outfits[character] = structuredClone(settingsOutfit);
        this.saveChatData(data);
    }
    getAddendum(character, slot) {
        const data = this.getChatData();
        return data.addendums[character]?.[slot] ?? null;
    }
    saveAddendum(character, slot, value) {
        var _a;
        const data = this.getChatData();
        const outfit = (_a = data.addendums)[character] ?? (_a[character] = {});
        outfit[slot] = value;
        this.saveChatData(data);
    }
    removeAddendum(character, slot) {
        var _a;
        const data = this.getChatData();
        const outfit = (_a = data.addendums)[character] ?? (_a[character] = {});
        delete outfit[slot];
        this.saveChatData(data);
    }
}
export const ChatOutfitStorage = new _ChatOutfitStorage();
