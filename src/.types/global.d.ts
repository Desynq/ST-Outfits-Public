import type { getContext } from '../../../../../../scripts/st-context.js';
import type { AutoOutfitSystem } from "../AutoOutfitSystem";
import type { BotOutfitPanel } from "../panel/BotOutfitPanel";
import type { UserOutfitPanel } from "../panel/UserOutfitPanel";

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