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
        if (!TraitRegistryView.isValidId(trait.id)) {
            return 'invalid-id';
        }
        if (this.has(trait.id)) {
            return 'trait-already-exists';
        }
        this.traits[trait.id] = structuredClone(trait);
        return 'added';
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
    rename(oldId, newId) {
        if (!this.has(oldId))
            return 'trait-not-found';
        if (oldId === newId)
            return 'noop';
        if (!TraitRegistryView.isValidId(newId)) {
            return 'invalid-id';
        }
        if (this.has(newId)) {
            return 'trait-already-exists';
        }
        const trait = this.traits[oldId];
        this.traits[newId] = {
            ...trait,
            id: newId
        };
        delete this.traits[oldId];
        return 'renamed';
    }
    /* -------------------------------- Utilities -------------------------------- */
    /**
     * Validates whether id is a lowercase kebab-case identifier
     */
    static isValidId(id) {
        return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);
    }
    static getDisplayName(id) {
        return id
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
}
