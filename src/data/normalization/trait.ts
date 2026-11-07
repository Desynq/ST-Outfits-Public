import { isRecord } from "../../util/narrowing.js";
import type { TraitAssignment, TraitVisual } from "../model/Outfit.js";

export function normalizeTraitAssignments(
	value: unknown
): TraitAssignment[] {
	if (!Array.isArray(value)) return [];

	const result: TraitAssignment[] = [];
	const seen = new Set<string>();

	for (const entry of value) {
		if (!isRecord(entry)) continue;

		const traitId = entry.traitId;
		if (typeof traitId !== 'string' || !traitId.trim()) {
			continue;
		}

		if (seen.has(traitId)) continue;
		seen.add(traitId);

		result.push({
			traitId,
			...(typeof entry.addendum === 'string'
				? { addendum: entry.addendum }
				: {})
		});
	}

	return result;
}



function normalizeTraitVisual(value: unknown): TraitVisual | null {
	if (!isRecord(value)) return null;

	switch (value.type) {
		case 'font-awesome':
			return typeof value.className === 'string'
				? { type: 'font-awesome', className: value.className }
				: null;

		case 'image': {
			const image = value.image;
			if (!isRecord(image)) return null;

			if (
				typeof image.key !== 'string' ||
				typeof image.width !== 'number' ||
				typeof image.height !== 'number'
			) return null;

			return {
				type: 'image',
				image: {
					key: image.key,
					width: image.width,
					height: image.height,
					hidden: typeof image.hidden === 'boolean'
						? image.hidden : false
				}
			};
		}

		default:
			return null;
	}
}