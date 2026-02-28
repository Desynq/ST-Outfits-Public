import { toKebabCase } from "../util/StringHelper.js";

const { macros } = SillyTavern.getContext();
const { registry: MacroRegistry, category: MacroCategory } = macros;


export type OutfitOwner = 'user' | 'char' | (string & {});
export type KindScope = '*' | (string & {});

export class OutfitMacroManager {

	private registry: Map<KindScope, string> = new Map();

	public constructor(
		private readonly owner: OutfitOwner,
		private readonly suffix: string,
		private domain: string
	) { }

	/**
	 * Clears macros if successful
	 */
	public setDomain(domain: string): boolean {
		const norm = toKebabCase(domain);
		if (norm === this.domain) return false;

		this.clear();
		this.domain = norm;
		return true;
	}

	/**
	 * @example asKey('user', '*') => 'user_outfit_<suffix>'
	 * @example asKey('user', 'head') => 'user_outfit_head_<suffix>'
	 */
	public asKey(kind: KindScope): string {
		const rest = kind === '*'
			? this.suffix
			: kind + '_' + this.suffix;

		return this.owner + `_${this.domain}_` + rest;
	}

	public set(kind: KindScope, value: string): void {
		const key = this.asKey(kind);

		if (this.registry.get(kind) === value) return;


		MacroRegistry.unregisterMacro(key);

		this.registry.set(kind, value);

		MacroRegistry.registerMacro(key, {
			category: MacroCategory.CHARACTER,
			description: 'Returns the summary for this section of the outfit',
			returns: 'This section\'s summary of the character\'s outfit',
			returnType: 'string',
			handler: () => value
		});
	}

	public clear(): void {
		for (const kind of this.registry.keys()) {
			MacroRegistry.unregisterMacro(this.asKey(kind));
		}

		this.registry.clear();
	}

	public get(kind: KindScope): string | undefined {
		return this.registry.get(kind);
	}
}