import { assertNever } from "../../shared.js";
import { toKebabCase } from "../../util/StringHelper.js";
import { TextSlotState, TraitSlotState } from "../model/OutfitSnapshots.js";
export function createSlot({ id, kind, type }) {
    const base = {
        id,
        kind,
        enabled: true,
        images: {},
        activeImageTag: null,
        equipped: true,
        conditions: {
            mode: 'none',
            items: []
        },
        synced: false
    };
    switch (type) {
        case 'text':
            return {
                ...base,
                type,
                value: ''
            };
        case 'traits':
            return {
                ...base,
                type,
                traits: []
            };
        default:
            return assertNever(type);
    }
}
export function createSlotState(slot, imageRegistry) {
    switch (slot.type) {
        case 'text':
            return new TextSlotState(slot, imageRegistry);
        case 'traits':
            return new TraitSlotState(slot, imageRegistry);
    }
}
export function contextualizeSlot(slot, traits) {
    switch (slot.type) {
        case 'text':
            return slot.value;
        case 'traits':
            return slot.traits
                .filter(({ traitId }) => traits[traitId])
                .map(({ traitId, addendum: rawAddendum, contextualizeInline }) => {
                const trait = traits[traitId];
                const addendum = rawAddendum?.trim();
                const tag = toKebabCase(trait.group.trim()) || 'trait';
                const indent = (text) => text.split('\n').map(line => `  ${line}`).join('\n');
                if (contextualizeInline) {
                    return [
                        `<${tag} name="${trait.name}">`,
                        indent([trait.description, addendum].filter(Boolean).join('\n')),
                        `</${tag}>`
                    ].join('\n');
                }
                return addendum
                    ? `<${tag} name="${trait.name}">\n${indent(addendum)}\n</${tag}>`
                    : `<${tag} name="${trait.name}" />`;
            })
                .join('\n\n');
    }
}
