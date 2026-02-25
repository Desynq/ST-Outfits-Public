

export type RequireKeys<T, K extends keyof T> =
	T & { [P in K]-?: T[P] };