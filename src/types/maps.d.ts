import { BotOutfitManager } from "../manager/BotOutfitManager.js";
import { UserOutfitManager } from "../manager/UserOutfitManager.js";

export type PanelType = 'user' | 'bot';

export interface OutfitManagerMap {
	'user': UserOutfitManager;
	'bot': BotOutfitManager;
}

export { };