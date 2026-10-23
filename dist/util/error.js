export function invariant(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}
export class MissingBlobError extends Error {
    constructor(message = 'Blob is missing.') {
        super(message);
        this.name = 'MissingBlobError';
        // Fix prototype chain for ES5/transpiled environments.
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
