import { ChatData } from "../data/model/ChatData.js";
import { Outfit } from "../data/model/Outfit.js";
import { normalizeOutfit } from "../data/normalize.js";
import { asStringRecord } from "../ObjectHelper.js";
import { ChatMetadata } from "../types/context.js";
import { isArrayOf, isRecordOf } from "../util/narrowing.js";

const { saveMetadataDebounced } = SillyTavern.getContext();


function fetchChatMetadata(): ChatMetadata {
	return SillyTavern.getContext().chatMetadata;
}

export function readOutfit(): Outfit | undefined {
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
	private getChatData(): ChatData {
		const raw = fetchChatMetadata()[NAMESPACE_KEY];

		if (!raw || typeof raw !== 'object') {
			return { outfits: {}, addendums: {} };
		}

		return {
			outfits: Object.fromEntries(
				Object.entries(raw.outfits ?? {})
					.map(([k, v]) => [k, normalizeOutfit(v)])
			),
			addendums: isRecordOf(
				raw.addendums,
				slots => isRecordOf(
					slots,
					v => typeof v === 'string'
				)
			)
				? raw.addendums
				: {}
		};
	}

	private saveChatData(data: ChatData): void {
		const metadata = fetchChatMetadata();
		metadata[NAMESPACE_KEY] = data;
		saveMetadataDebounced();
	}

	public loadOutfitInto(settingsOutfit: Outfit, character: string): void {
		const autosave = this.getChatData();

		const stored = autosave.outfits[character];
		if (!stored) return;

		settingsOutfit.slots = structuredClone(stored.slots);
	}

	public saveOutfit(settingsOutfit: Outfit, character: string): void {
		const data = this.getChatData();

		data.outfits[character] = structuredClone(settingsOutfit);

		this.saveChatData(data);
	}

	public getAddendum(character: string, slot: string): string | null {
		const data = this.getChatData();

		return data.addendums[character]?.[slot] ?? null;
	}

	public saveAddendum(character: string, slot: string, value: string): void {
		const data = this.getChatData();

		const outfit = data.addendums[character] ??= {};
		outfit[slot] = value;

		this.saveChatData(data);
	}

	public removeAddendum(character: string, slot: string): void {
		const data = this.getChatData();

		const outfit = data.addendums[character] ??= {};
		delete outfit[slot];

		this.saveChatData(data);
	}
}

export const ChatOutfitStorage = new _ChatOutfitStorage();