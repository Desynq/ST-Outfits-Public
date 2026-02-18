


export function notObject(value: any) {
	return !value || typeof value !== 'object';
}




export function ensureObject<T extends Record<string, any>>(
	target: any,
	shape: {
		[K in keyof T]: (value: any) => T[K];
	}
): T {
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

	return target as T;
}

export function asObject<T extends Record<string, any>>(fallback: T) {
	return (v: any): T => (v && typeof v === 'object'
		? v
		: { ...fallback });
}

export const asStringRecord = () =>
	(v: any): Record<string, string> => {
		const out: Record<string, string> = {};
		if (v && typeof v === 'object') {
			for (const [k, val] of Object.entries(v)) {
				if (typeof val === 'string') out[k] = val;
			}
		}
		return out;
	};

export const asStringArray = () =>
	(v: any): string[] =>
		Array.isArray(v) ? v.filter(x => typeof x === 'string') : [];

export const asBoolean = (fallback: boolean) =>
	(v: any): boolean => (typeof v === 'boolean' ? v : fallback);







export const resolveString = (v: unknown): string | undefined =>
	typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;

export function resolvePositiveNumber(v: unknown): number | undefined;
export function resolvePositiveNumber(v: unknown, fallback: number): number;
export function resolvePositiveNumber(v: unknown, fallback?: number): number | undefined {
	if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
	if (fallback === undefined) return undefined;

	if (!Number.isFinite(fallback) || fallback <= 0) {
		throw new Error(`Invalid fallback: ${fallback} is not a positive finite number`);
	}

	return fallback;
}

export function resolveTimestamp(v: unknown): number | undefined;
export function resolveTimestamp(v: unknown, fallback: number): number;
export function resolveTimestamp(v: unknown, fallback?: number): number | undefined {
	const f = (x: unknown): x is number =>
		typeof x === 'number' && Number.isFinite(x) && x >= 0 && Number.isInteger(x);

	if (f(v)) return v;
	if (fallback === undefined) return undefined;

	if (f(fallback)) return fallback;
	throw new Error(`Invalid fallback: ${fallback} is not a valid timestamp`);
}

export function resolveObject<T extends object>(v: unknown): T | undefined {
	return v && typeof v === 'object' ? (v as T) : undefined;
}




export function normalizeXY(value: unknown): [number, number] | undefined {
	if (
		Array.isArray(value) &&
		value.length === 2 &&
		typeof value[0] === 'number' &&
		typeof value[1] === 'number'
	) {
		return value as [number, number];
	}

	return undefined;
}