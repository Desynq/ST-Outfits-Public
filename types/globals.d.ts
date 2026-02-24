export { };

import { BotOutfitPanel } from '../src/panel/BotOutfitPanel';
import { UserOutfitPanel } from '../src/panel/UserOutfitPanel';
import { SillyTavernContext } from './context';

declare global {
	interface Window {
		botOutfitPanel?: BotOutfitPanel;
		userOutfitPanel?: UserOutfitPanel;
		autoOutfitSystem?: any;
	}

	var SillyTavern: {
		getContext(): SillyTavernContext;
	};
}