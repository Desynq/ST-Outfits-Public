

export type Procedure = (...args: any[]) => void;

export type Listener<T extends EventBus<any>> = Parameters<T['add']>[0];


export interface EventSubscriber<T extends Procedure = () => void> {

	add(listener: T): void;
}

export class EventBus<T extends Procedure = () => void>
	implements EventSubscriber<T> {

	private readonly listeners = new Set<T>();

	public add(listener: T): void {
		this.listeners.add(listener);
	}

	public remove(listener: T): void {
		this.listeners.delete(listener);
	}

	public clear(): void {
		this.listeners.clear();
	}

	public emit(...args: Parameters<T>): void {
		for (const listener of [...this.listeners]) {
			listener(...args);
		}
	}
}


export class MappedEventBus<K, V extends Procedure = () => void> {
	private readonly listeners = new Map<K, V>();

	public has(key: K): boolean {
		return this.listeners.has(key);
	}

	public set(key: K, listener: V): void {
		this.listeners.set(key, listener);
	}

	public remove(key: K): void {
		this.listeners.delete(key);
	}

	public clear(): void {
		this.listeners.clear();
	}

	public emit(...args: Parameters<V>): void {
		for (const listener of [...this.listeners.values()]) {
			listener(...args);
		}
	}
}