import { DEFAULT_SLOTS } from "../../Constants.js";
import { OutfitCollection, Outfit, CharactersOutfitMap } from "../model/Outfit.js";
import { OutfitSnapshot } from "../model/OutfitSnapshots.js";
import { normalizeOutfitCollection } from "../normalize.js";
import { MutableOutfitView } from "./MutableOutfitView.js";
import { OutfitSnapshotsView } from "./OutfitSnapshotsView.js";
import { OutfitView } from "./OutfitView.js";


export interface IOutfitCollectionView {
	getOrCreateAutosaved(): MutableOutfitView;

	areDisabledSlotsHidden(): boolean;
	hideDisabledSlots(hide: boolean): void;

	areEmptySlotsHidden(): boolean;
	hideEmptySlots(hide: boolean): void;

	getSnapshotView(): OutfitSnapshotsView;
}

export abstract class OutfitCollectionView implements IOutfitCollectionView {

	public constructor() { }

	protected abstract getOrCreateCollection(): OutfitCollection;

	protected withCollection<T>(fn: (c: OutfitCollection) => T): T {
		const collection = this.getOrCreateCollection();
		return fn(collection);
	}

	public getOrCreateAutosaved(): MutableOutfitView {
		const c = this.getOrCreateCollection();

		c.autoOutfit ??= this.createDefaultOutfit();
		return new MutableOutfitView('auto', c.autoOutfit);
	}

	protected createDefaultOutfit(): Outfit {
		return {
			slots: [...DEFAULT_SLOTS]
		};
	}

	public areDisabledSlotsHidden(): boolean {
		return this.withCollection(c => c.hideDisabled);
	}

	public hideDisabledSlots(hide: boolean): void {
		this.withCollection(c => c.hideDisabled = hide);
	}


	public areEmptySlotsHidden(): boolean {
		return this.withCollection(c => c.hideEmpty);
	}

	public hideEmptySlots(hide: boolean): void {
		this.withCollection(c => c.hideEmpty = hide);
	}

	public getSnapshotView(): OutfitSnapshotsView {
		const c = this.getOrCreateCollection();

		return new OutfitSnapshotsView(c.snapshots);
	}
}
export class UserOutfitCollectionView extends OutfitCollectionView {
	public constructor(
		private collection: OutfitCollection
	) {
		super();
	}

	protected override getOrCreateCollection(): OutfitCollection {
		return this.collection;
	}

	public getOutfitNames(): string[] {
		return Object.keys(this.collection.outfits);
	}

	public getSavedOutfit(outfitName: string): OutfitView | undefined {
		const outfit = this.collection.outfits[outfitName];
		if (outfit === undefined) return undefined;


		return new OutfitView(outfitName, outfit);
	}

	public saveOutfit(outfitName: string, outfit: OutfitSnapshot): void {
		this.collection.outfits[outfitName] = outfit;
	}

	public setAutosavedOutfit(outfit: OutfitSnapshot): void {
		this.collection.autoOutfit = outfit;
	}

	public deleteSavedOutfit(outfitName: string): void {
		delete this.collection.outfits[outfitName];
	}
}
export class CharacterOutfitCollectionView extends OutfitCollectionView {
	public constructor(
		private map: CharactersOutfitMap,
		private character: string
	) {
		super();
	}

	protected override getOrCreateCollection(): OutfitCollection {
		const existing = this.getOutfitCollection();
		if (existing) return existing;

		const created = normalizeOutfitCollection({});
		this.map[this.character] = created;
		return created;
	}

	public hasCollection(): boolean {
		return this.map[this.character] === undefined;
	}

	private getOutfitCollection(): OutfitCollection | undefined {
		return this.map[this.character];
	}

	public getSavedOutfitNames(): string[] {
		const collection = this.getOutfitCollection();
		if (collection === undefined) return [];
		return Object.keys(collection.outfits);
	}

	public getSavedOutfit(outfitName: string): OutfitView | undefined {
		if (this.hasCollection()) return undefined;

		const collection = this.getOrCreateCollection();
		const outfit = collection.outfits[outfitName];
		if (outfit === undefined) return undefined;

		return new OutfitView(outfitName, outfit);
	}

	public saveOutfit(outfitName: string, outfit: OutfitSnapshot): void {
		this.getOrCreateCollection().outfits[outfitName] = outfit;
	}

	public deleteSavedOutfit(outfitName: string): void {
		const outfits = this.getOutfitCollection();
		if (outfits === undefined) return;

		delete outfits.outfits[outfitName];
	}

	public loadOutfit(outfit: OutfitSnapshot): void {
		this.getOrCreateCollection().autoOutfit = outfit;
	}

	public clear(): void {
		delete this.map[this.character];
	}
}

