export function ensureObject(target, shape) {
    if (!target || typeof target !== 'object') {
        target = {};
    }
    for (const key in shape) {
        target[key] = shape[key](target[key]);
    }
    // Strip unknown keys
    for (const key in target) {
        if (!(key in shape)) {
            delete target[key];
        }
    }
    return target;
}
export const asObject = (fallback) => (v) => (v && typeof v === 'object' ? v : { ...fallback });
export const asStringRecord = () => (v) => {
    const out = {};
    if (v && typeof v === 'object') {
        for (const [k, val] of Object.entries(v)) {
            if (typeof val === 'string')
                out[k] = val;
        }
    }
    return out;
};
export const asStringArray = () => (v) => Array.isArray(v) ? v.filter(x => typeof x === 'string') : [];
export const asString = (v) => typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;
export const asBoolean = (fallback) => (v) => (typeof v === 'boolean' ? v : fallback);
