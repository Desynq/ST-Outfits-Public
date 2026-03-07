



export class EventBus<T extends (...args: any[]) => void = () => void> {

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

	public call(...args: Parameters<T>): void {
		for (const listener of [...this.listeners]) {
			listener(...args);
		}
	}
}