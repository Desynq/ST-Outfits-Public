import { ChatOutfitStorage } from "../../api/chat-metadata.js";
import { DEFAULT_SLOTS } from "../../Constants.js";
import { OutfitCollection, Outfit, CharactersOutfitMap } from "../model/Outfit.js";
import { OutfitSnapshot } from "../model/OutfitSnapshots.js";
import { normalizeOutfitCollection } from "../normalize.js";
import { MutableOutfitView } from "./MutableOutfitView.js";
import { OutfitSnapshotsView } from "./OutfitSnapshotsView.js";
import { OutfitView } from "./OutfitView.js";


export interface IOutfitCollectionView {
	getOrCreateCurrentOutfit(): MutableOutfitView;
	clearCurrentOutfit(): void;
	loadOutfit(outfit: OutfitSnapshot): void;

	areDisabledSlotsHidden(): boolean;
	hideDisabledSlots(hide: boolean): void;

	areEmptySlotsHidden(): boolean;
	hideEmptySlots(hide: boolean): void;

	getSnapshotView(): OutfitSnapshotsView;
}

export interface ICharacterOutfitCollectionView extends IOutfitCollectionView {
	saveCurrentOutfitToChat(): void;
	loadCurrentOutfitFromChat(): void;
}

export abstract class OutfitCollectionView implements IOutfitCollectionView {

	public constructor() { }

	protected abstract getOrCreateCollection(): OutfitCollection;
	public abstract hasCollection(): boolean;

	public abstract loadOutfit(outfit: OutfitSnapshot): void;

	protected withCollection<T>(fn: (c: OutfitCollection) => T): T {
		const collection = this.getOrCreateCollection();
		return fn(collection);
	}

	public getOrCreateCurrentOutfit(): MutableOutfitView {
		const c = this.getOrCreateCollection(); // instantiate current outfit

		c.current_outfit ??= this.createDefaultOutfit(); // add default slots
		return new MutableOutfitView('auto', c.current_outfit);
	}

	public getCurrentOutfit(): MutableOutfitView | null {
		if (!this.hasCollection()) return null;

		const c = this.getOrCreateCollection();

		return new MutableOutfitView('auto', c.current_outfit);
	}

	public clearCurrentOutfit(): void {
		const c = this.getOrCreateCollection();
		c.current_outfit = { slots: [] };
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

	public override hasCollection(): boolean {
		return true;
	}

	public getOutfitNames(): string[] {
		return Object.keys(this.collection.saved_outfits);
	}

	public getSavedOutfit(outfitName: string): OutfitView | undefined {
		const outfit = this.collection.saved_outfits[outfitName];
		if (outfit === undefined) return undefined;


		return new OutfitView(outfitName, outfit);
	}

	public saveOutfit(outfitName: string, outfit: OutfitSnapshot): void {
		this.collection.saved_outfits[outfitName] = outfit;
	}

	public override loadOutfit(outfit: OutfitSnapshot): void {
		this.collection.current_outfit = outfit;
	}

	public deleteSavedOutfit(outfitName: string): void {
		delete this.collection.saved_outfits[outfitName];
	}
}
export class CharacterOutfitCollectionView extends OutfitCollectionView implements ICharacterOutfitCollectionView {
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

	public override hasCollection(): boolean {
		return this.map[this.character] !== undefined;
	}

	private getOutfitCollection(): OutfitCollection | undefined {
		return this.map[this.character];
	}

	public getSavedOutfitNames(): string[] {
		const collection = this.getOutfitCollection();
		if (collection === undefined) return [];
		return Object.keys(collection.saved_outfits);
	}

	public getSavedOutfit(outfitName: string): OutfitView | undefined {
		if (!this.hasCollection()) return undefined;

		const collection = this.getOrCreateCollection();
		const outfit = collection.saved_outfits[outfitName];
		if (outfit === undefined) return undefined;

		return new OutfitView(outfitName, outfit);
	}

	public saveOutfit(outfitName: string, outfit: OutfitSnapshot): void {
		this.getOrCreateCollection().saved_outfits[outfitName] = outfit;
	}

	public deleteSavedOutfit(outfitName: string): void {
		const outfits = this.getOutfitCollection();
		if (outfits === undefined) return;

		delete outfits.saved_outfits[outfitName];
	}

	public override loadOutfit(outfit: OutfitSnapshot): void {
		this.getOrCreateCollection().current_outfit = outfit;
	}

	public clear(): void {
		delete this.map[this.character];
	}



	public loadCurrentOutfitFromChat(): void {
		const c = this.getOrCreateCollection();

		c.current_outfit ??= this.createDefaultOutfit();
		ChatOutfitStorage.loadOutfitInto(c.current_outfit, this.character);
	}

	public saveCurrentOutfitToChat(): void {
		const c = this.getOrCreateCollection();
		ChatOutfitStorage.saveOutfitToChat(c.current_outfit, this.character);
	}
}

