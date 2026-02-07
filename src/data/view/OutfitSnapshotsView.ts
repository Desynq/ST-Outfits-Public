import { OutfitCachedSnapshot } from "../model/Outfit.js";




interface OutfitDiff {
	added: Record<string, string>;
	removed: string[];
	changed: Record<string, { from: string; to: string; }>;
}

export class OutfitSnapshotsView {
	public constructor(
		protected snapshots: Record<string, OutfitCachedSnapshot>
	) { }

	public writeSnapshot(
		namespace: string,
		slots: Record<string, string>
	): void {
		this.snapshots[namespace] = {
			namespace,
			slots,
			createdAt: Date.now()
		};
	}

	public getSnapshot(namespace: string): OutfitCachedSnapshot | undefined {
		const cache = this.snapshots[namespace];
		return cache;
	}

	public deleteSnapshot(namespace: string): void {
		delete this.snapshots[namespace];
	}

	public getSnapshots(): readonly OutfitCachedSnapshot[] {
		return Object.values(this.snapshots);
	}
}



export function diffSnapshots(from: OutfitCachedSnapshot, to: OutfitCachedSnapshot): OutfitDiff {
	const diff = {
		added: {} as Record<string, string>,
		removed: [] as string[],
		changed: {} as Record<string, { from: string; to: string; }>
	};

	// same snapshot, nothing changed
	if (from.namespace === to.namespace) return diff;

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