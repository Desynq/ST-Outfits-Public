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
		const entries: string[] = [];

		for (const trait of registry.getAll()) {
			if (trait.contextInline === true) {
				continue;
			}

			const label = TraitRegistryView.getLabel(trait);
			entries.push(`${label}: ${trait.description}`);
		}

		return entries.join('\n\n');
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