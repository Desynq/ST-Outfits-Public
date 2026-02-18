export function isRecord(x) {
    return typeof x === 'object' && x !== null && !Array.isArray(x);
}
export function assertRecord(x) {
    if (!isRecord(x)) {
        throw new Error(`Expected record, got ${x}`);
    }
}
export function assertArray(x) {
    if (!Array.isArray(x)) {
        throw new Error(`Expected array, got ${x}`);
    }
}
export function assertString(x) {
    if (typeof x !== 'string') {
        throw new Error(`Expected string, got ${x}`);
    }
}
export function assertPositiveNumber(x) {
    if (typeof x !== 'number' || !Number.isFinite(x) || x <= 0) {
        throw new Error(`Expected positive number, got ${x}`);
    }
}
export function ensureRecordProperty(holder, key) {
    if (!isRecord(holder[key])) {
        holder[key] = {};
    }
    const value = holder[key];
    assertRecord(value);
    return value;
}
export function ensureArrayProperty(holder, key) {
    if (!Array.isArray(holder[key])) {
        holder[key] = [];
    }
    const value = holder[key];
    assertArray(value);
    return value;
}
