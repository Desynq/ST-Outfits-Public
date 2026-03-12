import { ChatAutosave } from "../data/model/Autosave.js";
import { Outfit } from "../data/model/Outfit.js";
import { normalizeOutfit } from "../data/normalize.js";
import { ChatMetadata } from "../types/context.js";

const { saveMetadataDebounced } = SillyTavern.getContext();


function fetchChatMetadata(): ChatMetadata {
	return SillyTavern.getContext().chatMetadata;
}

export function readOutfit(): Outfit | undefined {
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

	private loadAutosave(): ChatAutosave {
		const raw = fetchChatMetadata()[CURRENT_OUTFIT_KEY];

		if (!raw || typeof raw !== 'object') {
			return { outfits: {} };
		}

		return {
			outfits: Object.fromEntries(
				Object.entries(raw.outfits ?? {})
					.map(([k, v]) => [k, normalizeOutfit(v)])
			)
		};
	}

	public loadInto(settingsOutfit: Outfit, id: string): void {
		const autosave = this.loadAutosave();

		const stored = autosave.outfits[id];
		if (!stored) return;

		settingsOutfit.slots = structuredClone(stored.slots);
	}

	public saveFrom(settingsOutfit: Outfit, id: string): void {
		const metadata = fetchChatMetadata();

		const autosave = this.loadAutosave();

		autosave.outfits[id] = structuredClone(settingsOutfit);

		metadata[CURRENT_OUTFIT_KEY] = autosave;

		saveMetadataDebounced();
	}
}

export const ChatOutfitStorage = new _ChatOutfitStorage();