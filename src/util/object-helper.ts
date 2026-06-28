
export function deleteUndefined<T extends object>(
	obj: T
): {
	[K in keyof T as undefined extends T[K] ? never : K]: T[K];
} & Partial<T> {
	for (const key of Object.keys(obj) as Array<keyof T>) {
		if (obj[key] === undefined) {
			delete obj[key];
		}
	}

	return obj as any;
}