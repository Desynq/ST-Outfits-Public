import { isRecord } from "../../util/narrowing.js";
import type { TraitAssignment, TraitDefinition, TraitIcon } from "../model/Outfit.js";
import type { SettingsModel } from "../model/settings.js";

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
			addendum: typeof entry.addendum === 'string' ? entry.addendum : null,
			contextualizeInline: entry.contextualizeInline === true
		});
	}

	return result;
}



export function normalizeTraits(
	holder: Partial<SettingsModel>
): void {
	const registry = holder.traits;
	const source = isRecord(registry) && isRecord(registry.definitions)
		? registry.definitions
		: {};

	const definitions: Record<string, TraitDefinition> = {};

	for (const [key, value] of Object.entries(source)) {
		if (!isRecord(value)) continue;

		const id = key.trim();
		if (!id) continue;

		const name = typeof value.name === 'string'
			? value.name.trim() || 'Trait'
			: 'Trait';

		const group = typeof value.group === 'string'
			? value.group.trim()
			: '';

		const description = typeof value.description === 'string'
			? value.description.trim()
			: '';

		const contextInline = value.contextInline === true;

		let icon: TraitIcon | null = normalizeTraitVisual(value.icon);

		if (
			isRecord(value.icon)
			&& value.icon.type === 'font-awesome'
			&& typeof value.icon.className === 'string'
			&& value.icon.className.trim()
		) {
			icon = {
				type: 'font-awesome',
				className: value.icon.className.trim(),
				color: typeof value.icon.color === 'string'
					? value.icon.color.trim() || null
					: null
			};
		}

		definitions[id] = {
			id,
			name,
			group,
			description,
			contextInline,
			icon
		};
	}

	holder.traits = { definitions };
}



function normalizeTraitVisual(icon: unknown): TraitIcon | null {
	if (!isRecord(icon)) return null;

	switch (icon.type) {
		case 'font-awesome': {
			if (typeof icon.className !== 'string' || !icon.className.trim()) {
				return null;
			}

			return {
				type: 'font-awesome',
				className: icon.className.trim(),
				color: typeof icon.color === 'string'
					? icon.color.trim() || null
					: null
			};
		}

		case 'image': {
			const image = icon.image;
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