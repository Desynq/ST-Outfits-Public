
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



/**
 * Deletes a property from an object is the property is an empty record
 * @param obj 
 * @param key 
 * @returns 
 */
export function pruneProperty<T extends Record<string, any>>(
	obj: T,
	key: keyof T
): boolean {
	if (obj[key] && Object.keys(obj[key]).length === 0) {
		delete obj[key];
		return true;
	}

	return false;
}