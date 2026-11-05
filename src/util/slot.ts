import { OutfitSlot } from "../data/model/Outfit.js";


export function isSlotBlocked(slot: Readonly<OutfitSlot>, slots: readonly Readonly<OutfitSlot>[]): boolean {
	const requiredIds = new Set(
		slot.conditions.items.map(condition => condition.id)
	);

	return slots.some(s =>
		requiredIds.has(s.id) && (!s.enabled || !s.equipped)
	);
}




export interface MacroMatch {
	full: string;
	content: string;
	index: number;
	end: number;
}

export function iterateMacros(value: string): Iterable<MacroMatch> {
	return (function* () {
		let i = 0;

		while (i < value.length) {
			// Find opening {{
			if (value[i] === '{' && value[i + 1] === '{') {
				const start = i;
				i += 2;

				let depth = 1;

				while (i < value.length && depth > 0) {
					if (value[i] === '{' && value[i + 1] === '{') {
						depth++;
						i += 2;
						continue;
					}

					if (value[i] === '}' && value[i + 1] === '}') {
						depth--;
						i += 2;
						continue;
					}

					i++;
				}

				if (depth === 0) {
					const end = i;
					const full = value.slice(start, end);
					const content = full.slice(2, -2);

					yield {
						full,
						content,
						index: start,
						end
					};
				}
				else {
					// Unbalanced braces — stop parsing
					break;
				}
			}
			else {
				i++;
			}
		}
	})();
}


export function resolveKindMacros(value: string, kind: string): string {
	const normalizedKind = kind.toLowerCase();

	const resolve = (text: string): string => {
		let result = '';
		let lastIndex = 0;

		for (const macro of iterateMacros(text)) {
			result += text.slice(lastIndex, macro.index);

			const normalizedContent = macro.content
				.trim()
				.toLowerCase()
				.replace(/\s+/g, '-');

			result += normalizedContent === normalizedKind
				? macro.content
				: `{{${resolve(macro.content)}}}`;

			lastIndex = macro.end;
		}

		return result + text.slice(lastIndex);
	};

	return resolve(value);
}