export class Conditional {
    constructor(predicates) {
        this.predicates = predicates;
    }
    run(keys, onSuccess, onFailure) {
        for (const key of keys) {
            const predicate = this.predicates[key];
            const result = typeof predicate === 'function' ? predicate() : predicate;
            if (!result) {
                onFailure?.();
                return this;
            }
        }
        onSuccess?.();
        return this;
    }
}
export function branch(expression) {
    const handlers = [];
    const api = {
        on(...args) {
            const fn = args.pop();
            const keys = args;
            handlers.push({ keys, fn });
            return api;
        },
        always(fn) {
            handlers.push({ keys: [], fn });
            return api;
        },
        run(onNoMatch) {
            const value = typeof expression === 'function'
                ? expression()
                : expression;
            let matched = false;
            for (const { keys, fn } of handlers) {
                if (keys.length === 0 || keys.includes(value)) {
                    matched = true;
                    fn();
                }
            }
            if (!matched)
                onNoMatch?.();
        }
    };
    return api;
}
