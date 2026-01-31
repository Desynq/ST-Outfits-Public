import type { getContext } from '../../../../../st-context.js';
import type { AutoOutfitSystem } from "../AutoOutfitSystem.js";
import type { BotOutfitPanel } from "../panel/BotOutfitPanel.js";
import type { UserOutfitPanel } from "../panel/UserOutfitPanel.js";

export { };

declare global {
	interface Window {
		botOutfitPanel?: BotOutfitPanel;
		userOutfitPanel?: UserOutfitPanel;
		autoOutfitSystem?: AutoOutfitSystem;
	}

	var SillyTavern: {
		libs: unknown;
		getContext: typeof getContext;
	};
}