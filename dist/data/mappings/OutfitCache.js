import { isRecord } from "../../util/narrowing.js";
export function normalizeOutfitSnapshots(snapshots) {
    for (const [namespace, snapshot] of Object.entries(snapshots)) {
        if (!coerceOutfitSnapshot(snapshot)) {
            delete snapshots[namespace];
            continue;
        }
        if (snapshot.namespace !== namespace) {
            delete snapshots[namespace];
            continue;
        }
    }
}
function coerceOutfitSnapshot(x) {
    if (!isRecord(x))
        return false;
    if (typeof x.namespace !== 'string')
        return false;
    if (!isRecord(x.slots))
        return false;
    // coercion
    for (const [k, v] of Object.entries(x.slots)) {
        if (typeof v !== 'string')
            delete x.slots[k];
    }
    if (typeof x.createdAt !== 'number')
        x.createdAt = Date.now();
    return true;
}
export function normalizeOutfitDiffs(diffs) {
    for (const [namespace, diff] of Object.entries(diffs)) {
    }
}
function coerceOutfitDiff(x) {
    if (!isRecord(x))
        return false;
    if (typeof x.namespace !== 'string')
        return false;
    return true;
}
