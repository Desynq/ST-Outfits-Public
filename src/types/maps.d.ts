import { BotOutfitManager } from "../manager/BotOutfitManager.js";
import { CharOutfitManager } from "../manager/CharOutfitManager.js";
import { UserOutfitManager } from "../manager/UserOutfitManager.js";

export type PanelType = 'user' | 'bot' | 'char';

export interface OutfitManagerMap {
	'user': UserOutfitManager;
	'bot': BotOutfitManager;
	'char': CharOutfitManager;
}

export { };