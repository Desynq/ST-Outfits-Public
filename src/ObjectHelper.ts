



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

export const asObject = <T extends Record<string, any>>(fallback: T) =>
	(v: any): T => (v && typeof v === 'object' ? v : { ...fallback });

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

export const asString = (v: any): string | undefined =>
	typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;

export const asBoolean = (fallback: boolean) =>
	(v: any): boolean => (typeof v === 'boolean' ? v : fallback);



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