



export function clamp({ value, min, max }: {
	value: number;
	min: number;
	max: number;
}): number {
	if (max < min) {
		return min;
	}
	return Math.min(Math.max(value, min), max);
}