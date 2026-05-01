export class ResourceCleaner {
    constructor() {
        this.disposers = [];
    }
    add(disposer) {
        this.disposers.push(disposer);
    }
    dispose() {
        for (const disposer of this.disposers)
            disposer();
        this.disposers.length = 0;
    }
}
