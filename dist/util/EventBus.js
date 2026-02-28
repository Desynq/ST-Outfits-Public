export class EventBus {
    constructor() {
        this.listeners = new Set();
    }
    add(listener) {
        this.listeners.add(listener);
    }
    remove(listener) {
        this.listeners.delete(listener);
    }
    clear() {
        this.listeners.clear();
    }
    call(...args) {
        for (const listener of [...this.listeners]) {
            listener(...args);
        }
    }
}
