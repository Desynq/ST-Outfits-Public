

export interface SillyTavernContext {
	characterId: number;

	saveSettingsDebounced: () => void;
	reloadCurrentChat: () => Promise<void>;


	SlashCommandParser: any;
	SlashCommand: any;
	SlashCommandNamedArgument: any;
	ARGUMENT_TYPE: any;
	characters: {
		name: string;
	}[];
	extensionSettings: {
		variables?: {
			global?: Record<string, string>;
		};
	};
	event_types: any;
	eventSource: any;

	registerSlashCommand: any;

	registerMacro: (k: string, v: string | (() => string)) => void;
	unregisterMacro: (k: string) => void;
}