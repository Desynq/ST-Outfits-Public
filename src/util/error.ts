


export function invariant(
	condition: unknown,
	message: string
): asserts condition {
	if (!condition) {
		throw new Error(message);
	}
}


export class MissingBlobError extends Error {
	public constructor(message = 'Blob is missing.') {
		super(message);

		this.name = 'MissingBlobError';

		// Fix prototype chain for ES5/transpiled environments.
		Object.setPrototypeOf(this, new.target.prototype);
	}
}