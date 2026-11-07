import { OutfitTracker } from "../data/tracker.js";
import { TraitRegistryView } from "../data/view/TraitRegistryView.js";
import { KindScope, MacroManager } from "./MacroManager.js";


export class TraitManager {
	private static readonly macros = new MacroManager(
		'global',
		'definitions',
		'trait'
	);

	private static contextualize(): string {
		const registry = OutfitTracker.viewTraitRegistry();

		return registry.getAll()
			.map(definition => {
				return `${definition.name}: ${definition.description}`;
			})
			.join('\n\n');
	}

	public static updateMacros(): void {
		this.macros.set('*', this.contextualize());
	}

	public static clearMacros(): void {
		this.macros.clear();
	}

	public static getSummaryKey(scope: KindScope): string {
		return this.macros.asKey(scope);
	}

	public static getSummary(scope: KindScope): string | undefined {
		return this.macros.get(scope);
	}
}