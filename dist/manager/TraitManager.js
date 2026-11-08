import { OutfitTracker } from "../data/tracker.js";
import { TraitRegistryView } from "../data/view/TraitRegistryView.js";
import { MacroManager } from "./MacroManager.js";
export class TraitManager {
    static contextualize() {
        const registry = OutfitTracker.viewTraitRegistry();
        const entries = [];
        for (const trait of registry.getAll()) {
            if (trait.contextInline === true) {
                continue;
            }
            const label = TraitRegistryView.getLabel(trait);
            entries.push(`${label}: ${trait.description}`);
        }
        return entries.join('\n\n');
    }
    static updateMacros() {
        this.macros.set('*', this.contextualize());
    }
    static clearMacros() {
        this.macros.clear();
    }
    static getSummaryKey(scope) {
        return this.macros.asKey(scope);
    }
    static getSummary(scope) {
        return this.macros.get(scope);
    }
}
TraitManager.macros = new MacroManager('global', 'definitions', 'trait');
