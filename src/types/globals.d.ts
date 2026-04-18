export { };

// import('../../../../../../global');
import { BotOutfitPanel } from './panel/BotOutfitPanel';
import { UserOutfitPanel } from './panel/UserOutfitPanel';
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

declare const toastr: typeof import('toastr');