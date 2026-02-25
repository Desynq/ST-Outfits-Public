
const { registerMacro, unregisterMacro } = SillyTavern.getContext();


export type OutfitOwner = 'user' | 'char' | (string & {});
export type KindScope = '*' | (string & {});

export class OutfitMacroManager {

	private registry: Map<KindScope, string> = new Map();

	public constructor(
		private readonly owner: OutfitOwner,
		private readonly suffix: string
	) { }

	/**
	 * @example asKey('user', '*') => 'user_outfit_<suffix>'
	 * @example asKey('user', 'head') => 'user_outfit_head_<suffix>'
	 */
	public asKey(kind: KindScope): string {
		const rest = kind === '*'
			? this.suffix
			: kind + '_' + this.suffix;

		return this.owner + '_outfit_' + rest;
	}

	public set(kind: KindScope, value: string): void {
		const key = this.asKey(kind);

		if (this.registry.get(kind) === value) return;

		this.registry.set(kind, value);
		registerMacro(key, value);
	}

	public clear(): void {
		for (const kind of this.registry.keys()) {
			unregisterMacro(this.asKey(kind));
		}

		this.registry.clear();
	}

	public get(kind: KindScope): string | undefined {
		return this.registry.get(kind);
	}
}