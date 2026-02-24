export { };

import '../../../../global';
import { BotOutfitPanel } from './src/panel/BotOutfitPanel';
import { UserOutfitPanel } from './src/panel/UserOutfitPanel';

declare global {
	interface Window {
		botOutfitPanel?: BotOutfitPanel;
		userOutfitPanel?: UserOutfitPanel;
		autoOutfitSystem?: any;
	}
}