


type LazyPredicate = (() => boolean) | boolean;


export class Conditional<K extends string> {
	private readonly predicates: Record<K, LazyPredicate>;

	public constructor(predicates: Record<K, LazyPredicate>) {
		this.predicates = predicates;
	}

	public run(
		keys: readonly K[],
		onSuccess?: () => void,
		onFailure?: () => void
	): this {
		for (const key of keys) {
			const predicate = this.predicates[key];
			const result =
				typeof predicate === 'function' ? predicate() : predicate;

			if (!result) {
				onFailure?.();
				return this;
			}
		}

		onSuccess?.();
		return this;
	}
}


type LazyValue<T> = T | (() => T);

export function branch<K extends string>(expression: LazyValue<K>) {
	const handlers: {
		keys: readonly K[];
		fn: () => void;
	}[] = [];

	const api = {
		on(...args: [...keys: [K, ...K[]], fn: () => void]) {
			const fn = args.pop() as () => void;
			const keys = args as K[];
			handlers.push({ keys, fn });
			return api;
		},

		always(fn: () => void) {
			handlers.push({ keys: [], fn });
			return api;
		},

		run(onNoMatch?: () => void) {
			const value =
				typeof expression === 'function'
					? (expression as () => K)()
					: expression;

			let matched = false;

			for (const { keys, fn } of handlers) {
				if (keys.length === 0 || keys.includes(value)) {
					matched = true;
					fn();
				}
			}

			if (!matched) onNoMatch?.();
		}
	};

	return api;
}