

declare global {
	export type RequireKeys<T, K extends keyof T> =
		T & { [P in K]-?: T[P] };


	export type Disposer = () => void;

	export type Constructor<T> = new () => T;



	export type DeepReadonly<T> = {
		readonly [K in keyof T]: DeepReadonly<T[K]>;
	};
}

export { };