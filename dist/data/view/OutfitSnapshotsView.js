export class OutfitSnapshotsView {
    constructor(snapshots) {
        this.snapshots = snapshots;
    }
    writeSnapshot(namespace, slots) {
        this.snapshots[namespace] = {
            namespace,
            slots,
            createdAt: Date.now()
        };
    }
    getSnapshot(namespace) {
        const cache = this.snapshots[namespace];
        return cache;
    }
    deleteSnapshot(namespace) {
        delete this.snapshots[namespace];
    }
    getSnapshots() {
        return Object.values(this.snapshots);
    }
}
export function diffSnapshots(from, to) {
    const diff = {
        added: {},
        removed: [],
        changed: {}
    };
    // same snapshot, nothing changed
    if (from.namespace === to.namespace)
        return diff;
    const fromSlots = from.slots;
    const toSlots = to.slots;
    // detect removed + changed
    for (const [slot, fromValue] of Object.entries(fromSlots)) {
        if (!(slot in toSlots)) {
            diff.removed.push(slot);
            continue;
        }
        const toValue = toSlots[slot];
        if (fromValue !== toValue) {
            diff.changed[slot] = {
                from: fromValue,
                to: toValue
            };
        }
    }
    for (const [slot, toValue] of Object.entries(toSlots)) {
        if (!(slot in fromSlots)) {
            diff.added[slot] = toValue;
        }
    }
    return diff;
}
