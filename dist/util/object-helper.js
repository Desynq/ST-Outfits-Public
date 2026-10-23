export function deleteUndefined(obj) {
    for (const key of Object.keys(obj)) {
        if (obj[key] === undefined) {
            delete obj[key];
        }
    }
    return obj;
}
/**
 * Deletes a property from an object is the property is an empty record
 * @param obj
 * @param key
 * @returns
 */
export function pruneProperty(obj, key) {
    if (obj[key] && Object.keys(obj[key]).length === 0) {
        delete obj[key];
        return true;
    }
    return false;
}
