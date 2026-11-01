import { CHARACTER_NOTE_OPTIONS, CharacterNoteType } from '../../Constants.js';

export type SlotIconRule =
	| {
		type: CharacterNoteType;
		keywords: string[];
		icon?: never;
	}
	| {
		icon: string;
		keywords: string[];
		type?: never;
	};

export const DEFAULT_SLOT_ICON_RULES: SlotIconRule[] = [
	{ type: 'dialogue', keywords: ['speech', 'dialogue'] },
	{ type: 'clothing', keywords: ['clothing', 'outfit', 'wear'] },
	{ type: 'character', keywords: ['character', 'personality', 'bio'] },
	{ type: 'nsfw', keywords: ['kinks', 'fetishes', 'erotic'] },
];

export function getSlotIcon(
	slotId: string,
	hasNote: (type: CharacterNoteType) => boolean,
	rules: readonly SlotIconRule[]
): string | null {
	const parts = new Set(slotId.toLowerCase().split('-'));

	for (const rule of rules) {
		if (!rule.keywords.some(keyword => parts.has(keyword))) {
			continue;
		}

		if (rule.type && hasNote(rule.type)) {
			continue;
		}

		return rule.type
			? CHARACTER_NOTE_OPTIONS[rule.type].icon
			: rule.icon;
	}

	return null;
}