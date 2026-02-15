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
function slot(id, kind) {
    return {
        id,
        value: 'None',
        kind,
        enabled: true,
        images: {},
        activeImageTag: null
    };
}
export const DEFAULT_SLOTS = [
    ...DEFAULT_CLOTHING_SLOTS.map(id => slot(id, 'clothing')),
    ...DEFAULT_ACCESSORY_SLOTS.map(id => slot(id, 'accessory'))
];
