import type { SlotIconRule } from "../../ui/prompt/configure-slot-icons.js";
import type { OutfitCollectionsTree, ImageRef, TraitRegistry } from "./Outfit.js";
import type { PanelSettings, CharPanelsTree } from "./Panels.js";
import type { SlotPresetV1 } from "./SlotPreset.js";
import type { UIStateModel } from "./ui-state.js";




export interface SettingsModel {
	version: number;
	enableSysMessages: boolean;
	autoOpenBot: boolean;
	autoOpenUser: boolean;


	presets: OutfitCollectionsTree;
	botPanel: PanelSettings;
	userPanel: PanelSettings;
	charPanels: CharPanelsTree;

	// key: base64
	images: Record<string, ImageRef>;

	slotPresets: Record<string, SlotPresetV1>;

	slotIconRules: SlotIconRule[];

	traits: TraitRegistry;

	uiState: UIStateModel;
}
