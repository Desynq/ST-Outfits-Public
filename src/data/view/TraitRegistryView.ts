import { hasOwnProperty } from "../../util/object-helper.js";
import type { TraitDefinition, TraitRegistry } from "../model/Outfit.js";






export type UpdateTraitResult =
	| 'trait-not-found'
	| 'updated';

export type RemoveTraitResult =
	| 'trait-not-found'
	| 'removed';

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

	public add(trait: Omit<TraitDefinition, 'id'>): TraitDefinition {
		const definition: TraitDefinition = {
			...structuredClone(trait),
			id: crypto.randomUUID()
		};

		this.traits[definition.id] = definition;
		return definition;
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

	/* -------------------------------- Utilities -------------------------------- */

	public static isValidId(id: string): boolean {
		return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
	}

	public static toDisplayName(kebab: string): string {
		return kebab
			.split('-')
			.map(word =>
				word.charAt(0).toUpperCase() + word.slice(1)
			)
			.join(' ');
	}
}
