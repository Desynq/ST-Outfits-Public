export const DEFAULT_CLOTHING_SLOTS = [
    'headwear',
    'topwear',
    'top-underwear',
    'bottomwear',
    'bottom-underwear',
    'footwear',
    'foot-underwear',
    'outfit',
    'outfit-underwear'
];
export const DEFAULT_ACCESSORY_SLOTS = [
    'head-accessory',
    'ears-accessory',
    'eyes-accessory',
    'mouth-accessory',
    'neck-accessory',
    'body-accessory',
    'arms-accessory',
    'hands-accessory',
    'waist-accessory',
    'bottom-accessory',
    'legs-accessory',
    'foot-accessory'
];
export function toSlot(from) {
    return {
        id: from.id,
        value: from.value ?? 'None',
        kind: from.kind,
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
}
export const DEFAULT_SLOTS = [
    ...DEFAULT_CLOTHING_SLOTS.map(id => toSlot({ id, kind: 'clothing' })),
    ...DEFAULT_ACCESSORY_SLOTS.map(id => toSlot({ id, kind: 'accessory' }))
];
