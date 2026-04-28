import { Outfit } from "./Outfit.js";



export interface ChatData {
	/**
	 * {[character]: Outfit}
	 */
	outfits: Record<string, Outfit>;

	/**
	 * {[character]: {[slot]: string}}
	 */
	addendums: Record<string, Record<string, string>>;
}