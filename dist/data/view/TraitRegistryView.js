import { hasOwnProperty } from "../../util/object-helper.js";
export class TraitRegistryView {
    constructor(registry) {
        this.registry = registry;
    }
    get traits() {
        return this.registry.definitions;
    }
    /* -------------------------------- Lookup -------------------------------- */
    get definitions() {
        return this.registry.definitions;
    }
    get(id) {
        if (!this.has(id))
            return undefined;
        return this.traits[id];
    }
    has(id) {
        return hasOwnProperty(this.traits, id);
    }
    getAll() {
        return Object.values(this.traits);
    }
    getIds() {
        return Object.keys(this.traits);
    }
    get size() {
        return Object.keys(this.traits).length;
    }
    /* -------------------------------- Mutation -------------------------------- */
    add(trait) {
        const definition = {
            ...structuredClone(trait),
            id: crypto.randomUUID()
        };
        this.traits[definition.id] = definition;
        return definition;
    }
    update(id, changes) {
        if (!this.has(id))
            return 'trait-not-found';
        Object.assign(this.traits[id], structuredClone(changes));
        return 'updated';
    }
    remove(id) {
        if (!this.has(id))
            return 'trait-not-found';
        delete this.traits[id];
        return 'removed';
    }
    /* -------------------------------- Utilities -------------------------------- */
    static isValidId(id) {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    }
    static toDisplayName(kebab) {
        return kebab
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    static getIconClass(visual) {
        return visual?.type === 'font-awesome'
            ? visual.className
            : 'fa-solid fa-tag';
    }
}
