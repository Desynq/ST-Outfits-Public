type MacroCategories = Readonly<{
	/** Basic utilities and text manipulation (newline, noop, trim, reverse, comment) */
	UTILITY: 'utility';
	/** Randomization and dice rolling (random, pick, roll) */
	RANDOM: 'random';
	/** Participant names and name lists (user, char, group, notChar) */
	NAMES: 'names';
	/** Character card fields and persona (description, personality, scenario, mesExamples, persona) */
	CHARACTER: 'character';
	/** Chat history, messages, and swipes */
	CHAT: 'chat';
	/** Date, time, and duration macros */
	TIME: 'time';
	/** Local and global variable operations */
	VARIABLE: 'variable';
	/** Prompt templates for text completion (instruct sequences, system prompts, author's notes, context templates) */
	PROMPTS: 'prompts';
	/** Runtime application state (model, API, lastGenerationType, isMobile) */
	STATE: 'state';
	/** Macros that don't fit in any of the other categories, but don't really need/deserve their own */
	MISC: 'misc';
}>;

type MacroCategory = MacroCategories[keyof MacroCategories] | (string & {});

type MacroValueTypes = Readonly<{
	STRING: "string";
	INTEGER: "integer";
	NUMBER: "number";
	BOOLEAN: "boolean";
}>;

type MacroValueType = MacroValueTypes[keyof MacroValueTypes] | (string & {});

type MacroDefinitionOptions = {
	aliases?: MacroAliasDef[];
	category: MacroCategory;
	unnamedArgs?: number | MacroUnnamedArgDef[];
	list?: boolean | MacroListSpec;
	strictArgs?: boolean;
	description?: string;
	returns?: string;
	returnType?: MacroValueType | MacroValueType[];
	displayOverride?: string;
	exampleUsage?: string | string[];
	handler: MacroHandler;
};

type MacroAliasDef = {
	alias: string;
	visible?: boolean;
};

type MacroUnnamedArgDef = {
	name: string;
	optional?: boolean;
	defaultValue?: string;
	type?: string | string[];
	sampleValue?: string;
	description?: string;
};

type MacroListSpec = {
	min?: number;
	max?: number;
};




type MacroHandler = (context: {
	name: string;
	args: string[];
	unnamedArgs: string[];
	list: string[];
	namedArgs: {
		[key: string]: string;
	};
	raw: string;
	env: MacroEnv;
	cstNode: CstNode | null;
	range: {
		startOffset: number;
		endOffset: number;
	} | null;
	normalize: (value: any) => string;
}) => string;






type MacroDefinition = {
	name: string;
	aliases: MacroResolvedAlias[];
	category: MacroCategory;
	minArgs: number;
	maxArgs: number;
	unnamedArgDefs: MacroUnnamedArgDef[];
	list: {
		min: number;
		max: (number | null);
	} | null;
	strictArgs: boolean;
	description: string;
	returns: string | null;
	returnType: MacroValueType | MacroValueType[];
	displayOverride: string | null;
	exampleUsage: string[];
	handler: MacroHandler;
	source: MacroSource;
	aliasOf: string | null;
	aliasVisible: boolean | null;
};

type MacroResolvedAlias = {
	alias: string;
	visible: boolean;
};

type MacroResolvedAlias = {
	alias: string;
	visible: boolean;
};

type MacroSource = {
	name: string;
	isExtension: boolean;
	isThirdParty: boolean;
};

interface ChatMetadata {
	tainted?: boolean;
	integrity?: string;
	scenario?: string;
	persona?: string;
	[key: string]: any;
}

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

	macros: {
		registry: {
			registerMacro: (name: string, options: MacroDefinitionOptions) => MacroDefinition | null;
			unregisterMacro: (name: string) => boolean;
		};
		category: MacroCategories;
	};

	substituteParams(content: string, options?: {
		name1Override?: string;
		name2Override?: string;
		original?: string;
		groupOverride?: string;
		replaceCharacterCard?: boolean;
		dynamicMacros?: Record<string, string | MacroHandler>;
		postProcessFn?: (x: string) => string;
	}, ...args: any[]): string;

	saveMetadataDebounced(): void;
	chatMetadata: ChatMetadata;
}