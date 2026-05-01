

export class ResourceCleaner {
	private readonly disposers: (Disposer)[] = [];

	public add(disposer: Disposer): void {
		this.disposers.push(disposer);
	}

	public dispose(): void {
		for (const disposer of this.disposers) disposer();
		this.disposers.length = 0;
	}
}