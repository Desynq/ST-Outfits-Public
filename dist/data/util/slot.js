import { assertNever } from "../../shared.js";
import { TextSlotState, TraitSlotState } from "../model/OutfitSnapshots.js";
import { TraitRegistryView } from "../view/TraitRegistryView.js";
export function createSlot({ id, kind, type }) {
    const base = {
        id,
        kind,
        enabled: true,
        images: {},
        activeImageTag: null,
        equipped: false,
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
                .map(({ traitId, addendum }) => {
                const name = TraitRegistryView.getDisplayName(traitId);
                const manifestation = addendum?.trim();
                return `- ${name}${manifestation ? `: ${manifestation}` : ''}`;
            })
                .join('\n');
    }
}
