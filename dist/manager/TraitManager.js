import { OutfitTracker } from "../data/tracker.js";
import { TraitRegistryView } from "../data/view/TraitRegistryView.js";
import { MacroManager } from "./MacroManager.js";
export class TraitManager {
    static contextualize() {
        const registry = OutfitTracker.viewTraitRegistry();
        return registry.getAll()
            .map(definition => {
            const name = TraitRegistryView.getDisplayName(definition.id);
            return `${name}: ${definition.description}`;
        })
            .join('\n\n');
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
