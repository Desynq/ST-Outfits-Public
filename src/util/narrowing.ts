


export function isRecord(x: unknown): x is Record<string, unknown> {
	return typeof x === 'object' && x !== null && !Array.isArray(x);
}

export function assertRecord(x: unknown): asserts x is Record<string, unknown> {
	if (!isRecord(x)) {
		throw new Error(`Expected record, got ${x}`);
	}
}


export function assertArray(x: unknown): asserts x is unknown[] {
	if (!Array.isArray(x)) {
		throw new Error(`Expected array, got ${x}`);
	}
}

export function assertString(x: unknown): asserts x is string {
	if (typeof x !== 'string') {
		throw new Error(`Expected string, got ${x}`);
	}
}

export function assertPositiveNumber(x: unknown): asserts x is number {
	if (typeof x !== 'number' || !Number.isFinite(x) || x <= 0) {
		throw new Error(`Expected positive number, got ${x}`);
	}
}





export function ensureRecordProperty(
	holder: Record<string, unknown>,
	key: string
): Record<string, unknown> {
	if (!isRecord(holder[key])) {
		holder[key] = {};
	}
	const value = holder[key];
	assertRecord(value);
	return value;
}

export function ensureArrayProperty(
	holder: Record<string, unknown>,
	key: string
): unknown[] {
	if (!Array.isArray(holder[key])) {
		holder[key] = [];
	}

	const value = holder[key];
	assertArray(value);
	return value;
}