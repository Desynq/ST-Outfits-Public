export class EventBus {
    constructor() {
        this.listeners = new Set();
    }
    add(listener) {
        this.listeners.add(listener);
        return () => this.remove(listener);
    }
    remove(listener) {
        this.listeners.delete(listener);
    }
    clear() {
        this.listeners.clear();
    }
    emit(...args) {
        for (const listener of [...this.listeners]) {
            listener(...args);
        }
    }
}
export class MappedEventBus {
    constructor() {
        this.listeners = new Map();
    }
    has(key) {
        return this.listeners.has(key);
    }
    set(key, listener) {
        this.listeners.set(key, listener);
    }
    remove(key) {
        this.listeners.delete(key);
    }
    clear() {
        this.listeners.clear();
    }
    emit(...args) {
        for (const listener of [...this.listeners.values()]) {
            listener(...args);
        }
    }
}
