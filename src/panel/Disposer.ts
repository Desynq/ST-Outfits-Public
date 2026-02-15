


export class Disposer {
	private readonly disposers: (() => void)[] = [];

	public add(fn: () => void): void {
		this.disposers.push(fn);
	}

	public dispose(): void {
		for (const fn of this.disposers) fn();
		this.disposers.length = 0;
	}
}