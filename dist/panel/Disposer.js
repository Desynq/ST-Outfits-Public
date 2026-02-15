export class Disposer {
    constructor() {
        this.disposers = [];
    }
    add(fn) {
        this.disposers.push(fn);
    }
    dispose() {
        for (const fn of this.disposers)
            fn();
        this.disposers.length = 0;
    }
}
