export function notObject(value) {
    return !value || typeof value !== 'object';
}
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
export function asObject(fallback) {
    return (v) => (v && typeof v === 'object'
        ? v
        : { ...fallback });
}
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
export const asBoolean = (fallback) => (v) => (typeof v === 'boolean' ? v : fallback);
export const resolveString = (v) => typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;
export function resolvePositiveNumber(v, fallback) {
    if (typeof v === 'number' && Number.isFinite(v) && v > 0)
        return v;
    if (fallback === undefined)
        return undefined;
    if (!Number.isFinite(fallback) || fallback <= 0) {
        throw new Error(`Invalid fallback: ${fallback} is not a positive finite number`);
    }
    return fallback;
}
export function resolveTimestamp(v, fallback) {
    const f = (x) => typeof x === 'number' && Number.isFinite(x) && x >= 0 && Number.isInteger(x);
    if (f(v))
        return v;
    if (fallback === undefined)
        return undefined;
    if (f(fallback))
        return fallback;
    throw new Error(`Invalid fallback: ${fallback} is not a valid timestamp`);
}
export function resolveObject(v) {
    return v && typeof v === 'object' ? v : undefined;
}
export function normalizeXY(value) {
    if (Array.isArray(value) &&
        value.length === 2 &&
        typeof value[0] === 'number' &&
        typeof value[1] === 'number') {
        return value;
    }
    return undefined;
}
