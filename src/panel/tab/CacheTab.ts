import { OutfitCachedSnapshot } from "../../data/model/Outfit.js";
import { setGlobalVariable } from "../../manager/GlobalVarManager.js";
import { createButton } from "../../util/element/ButtonHelper.js";
import { addDoubleTapListener } from "../../util/element/click-actions.js";
import { createElement } from "../../util/ElementHelper.js";
import { toastrClipboard } from "../../util/ToastrHelper.js";
import { PanelTab } from "./PanelTab.js";



export class CacheTab extends PanelTab {

	public override render(contentArea: HTMLDivElement): void {
		this.renderCacheButton(contentArea);
		this.renderSnapshots(contentArea);
	}

	private renderCacheButton(contentArea: HTMLDivElement): void {
		const startCacheWrite = () => {
			const box = createElement('div', 'cache-write-container');

			const input = document.createElement('input');
			input.type = 'text';
			input.className = 'cache-write-input';
			input.value = `last_outfit`;
			input.autocomplete = 'off';
			input.spellcheck = false;

			box.appendChild(input);

			// live sanitization
			input.addEventListener('input', () => {
				input.value = input.value.replace(/[^a-zA-Z0-9_.]/g, '');
			});

			// John_Doe.cache_0 -> John_Doe.outfit.cache.cache_0
			const commit = () => {
				const raw = input.value.trim();
				if (!raw) {
					cancel();
					return;
				}

				if (!/^[a-zA-Z0-9_.]+$/.test(raw)) {
					return;
				}

				const key = normalizeOutfitCacheKey(raw);

				this.cacheCurrentOutfit(key);
				this.panel.saveAndRender();
			};

			const cancel = () => {
				restoreButton();
			};

			input.addEventListener('keyup', (e) => {
				if (e.key === 'Enter') commit();
				else if (e.key === 'Escape') cancel();
			});

			// input.addEventListener('blur', cancel);

			const restoreButton = () => {
				box.replaceWith(cacheButton);
			};

			cacheButton.replaceWith(box);
			input.focus();
			input.select();
		};

		const cacheButton = createButton(
			'system-tab-button cache-outfit-btn',
			'Cache Current Outfit',
			startCacheWrite
		);

		contentArea.appendChild(cacheButton);
	}

	private cacheCurrentOutfit(key: string): void {
		const summary = this.outfitManager.createOutfitSummary();
		const cacheTree = this.outfitManager.getSnapshotsView();
		const slotMap = this.outfitManager.getVisibleSlotMap();
		cacheTree.writeSnapshot(key, slotMap);
		setGlobalVariable(key, summary);

		const gvar = `{{getglobalvar::${key}}}`;
		toastrClipboard(
			'success',
			gvar,
			`Cached current outfit.<br>Access with:<br>${gvar}.`,
			'ST Outfits'
		);
	}

	private renderSnapshots(contentArea: HTMLDivElement): void {
		const snapshots = this.outfitManager.getSnapshotsView().getSnapshots();
		const container = createElement('div', 'outfit-snapshot-container');

		for (const snapshot of snapshots) {
			this.renderSnapshot(container, snapshot);
		}

		contentArea.appendChild(container);
	}

	private renderSnapshot(container: HTMLDivElement, snapshotData: OutfitCachedSnapshot): void {
		const snapshotEl = createElement('div', 'outfit-snapshot');

		/* --------------------------------- Header --------------------------------- */
		const header = createElement('div', 'outfit-snapshot-header');

		const title = createElement('div', 'outfit-snapshot-title', snapshotData.namespace);

		const deleteBtn = createElement('button', 'outfit-snapshot-delete', '✕');

		header.append(title, deleteBtn);

		/* -------------------- Body (collapsed readonly textbox) ------------------- */
		const body = createElement('div', 'outfit-snapshot-body');

		const textarea = createElement('textarea', 'outfit-snapshot-text');
		textarea.readOnly = true;
		textarea.rows = 2;


		addDoubleTapListener(title, () => {
			// TODO: Add feature to change a snapshot's namespace
		});

		deleteBtn.addEventListener('click', () => {
			this.outfitManager.getSnapshotsView().deleteSnapshot(snapshotData.namespace);
			snapshotEl.remove();
		});

		snapshotEl.append(header, body);
		container.appendChild(snapshotEl);
	}
}

function normalizeOutfitCacheKey(raw: string): string {
	const segments = raw.split('.').filter(Boolean);

	// if user already included outfit.cache, don't double-insert
	for (let i = 0; i < segments.length - 1; i++) {
		if (segments[i] === 'outfit' && segments[i + 1] === 'cache') {
			return segments.join('.');
		}
	}

	// insert outfit.cache before the final segment
	if (segments.length === 1) {
		return `outfit.cache.${segments[0]}`;
	}

	const leaf = segments.pop()!;
	return `${segments.join('.')}.outfit.cache.${leaf}`;
}