import { OutfitTracker } from "../data/tracker.js";
import { MacroManager } from "./MacroManager.js";
export class TraitManager {
    static contextualize() {
        const registry = OutfitTracker.viewTraitRegistry();
        return registry.getAll()
            .map(definition => {
            return `${definition.name}: ${definition.description}`;
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
