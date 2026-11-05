import { hasOwnProperty } from "../../util/object-helper.js";
import type { TraitDefinition, TraitRegistry } from "../model/Outfit.js";






export type AddTraitResult =
	| 'invalid-id'
	| 'trait-already-exists'
	| 'added';

export type UpdateTraitResult =
	| 'trait-not-found'
	| 'updated';

export type RemoveTraitResult =
	| 'trait-not-found'
	| 'removed';

export type RenameTraitResult =
	| 'trait-not-found'
	| 'invalid-id'
	| 'trait-already-exists'
	| 'noop'
	| 'renamed';

export class TraitRegistryView {

	public constructor(
		private readonly registry: TraitRegistry
	) { }

	private get traits(): Record<string, TraitDefinition> {
		return this.registry.definitions;
	}

	/* -------------------------------- Lookup -------------------------------- */

	public get definitions(): DeepReadonly<TraitRegistry['definitions']> {
		return this.registry.definitions;
	}

	public get(id: string): DeepReadonly<TraitDefinition> | undefined {
		if (!this.has(id)) return undefined;
		return this.traits[id];
	}

	public has(id: string): boolean {
		return hasOwnProperty(this.traits, id);
	}

	public getAll(): DeepReadonly<TraitDefinition[]> {
		return Object.values(this.traits);
	}

	public getIds(): readonly string[] {
		return Object.keys(this.traits);
	}

	public get size(): number {
		return Object.keys(this.traits).length;
	}

	/* -------------------------------- Mutation -------------------------------- */

	public add(trait: TraitDefinition): AddTraitResult {
		if (!TraitRegistryView.isValidId(trait.id)) {
			return 'invalid-id';
		}

		if (this.has(trait.id)) {
			return 'trait-already-exists';
		}

		this.traits[trait.id] = structuredClone(trait);
		return 'added';
	}

	public update(
		id: string,
		changes: Partial<Omit<TraitDefinition, 'id'>>
	): UpdateTraitResult {
		if (!this.has(id)) return 'trait-not-found';

		Object.assign(this.traits[id], structuredClone(changes));
		return 'updated';
	}

	public remove(id: string): RemoveTraitResult {
		if (!this.has(id)) return 'trait-not-found';

		delete this.traits[id];
		return 'removed';
	}

	public rename(
		oldId: string,
		newId: string
	): RenameTraitResult {
		if (!this.has(oldId)) return 'trait-not-found';
		if (oldId === newId) return 'noop';

		if (!TraitRegistryView.isValidId(newId)) {
			return 'invalid-id';
		}

		if (this.has(newId)) {
			return 'trait-already-exists';
		}

		const trait = this.traits[oldId];

		this.traits[newId] = {
			...trait,
			id: newId
		};

		delete this.traits[oldId];
		return 'renamed';
	}

	/* -------------------------------- Utilities -------------------------------- */

	/**
	 * Validates whether id is a lowercase kebab-case identifier
	 */
	public static isValidId(id: string): boolean {
		return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);
	}

	public static getDisplayName(id: string): string {
		return id
			.split('-')
			.map(word =>
				word.charAt(0).toUpperCase() + word.slice(1)
			)
			.join(' ');
	}
}
