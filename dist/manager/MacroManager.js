import { toKebabCase } from "../util/StringHelper.js";
const { macros } = SillyTavern.getContext();
const { registry: MacroRegistry, category: MacroCategory } = macros;
export class OutfitMacroManager {
    constructor(owner, suffix, domain) {
        this.owner = owner;
        this.suffix = suffix;
        this.domain = domain;
        this.registry = new Map();
    }
    /**
     * Clears macros if successful
     */
    setDomain(domain) {
        const norm = toKebabCase(domain);
        if (norm === this.domain)
            return false;
        this.clear();
        this.domain = norm;
        return true;
    }
    /**
     * @example asKey('user', '*') => 'user_outfit_<suffix>'
     * @example asKey('user', 'head') => 'user_outfit_head_<suffix>'
     */
    asKey(kind) {
        const rest = kind === '*'
            ? this.suffix
            : kind + '_' + this.suffix;
        return this.owner + `_${this.domain}_` + rest;
    }
    set(kind, value) {
        const key = this.asKey(kind);
        if (this.registry.get(kind) === value)
            return;
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
    clear() {
        for (const kind of this.registry.keys()) {
            MacroRegistry.unregisterMacro(this.asKey(kind));
        }
        this.registry.clear();
    }
    get(kind) {
        return this.registry.get(kind);
    }
}
