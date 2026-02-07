import { setGlobalVariable } from "../../manager/GlobalVarManager.js";
import { createButton } from "../../util/element/ButtonHelper.js";
import { toastrClipboard } from "../../util/ToastrHelper.js";
import { PanelTab } from "./PanelTab.js";



export class CacheTab extends PanelTab {

	public override render(contentArea: HTMLDivElement): void {
		this.renderCacheButton(contentArea);
	}

	private renderCacheButton(contentArea: HTMLDivElement): void {
		const startCacheRename = () => {
			const input = document.createElement('input');
			input.type = 'text';
			input.className = 'cache-outfit-input';
			input.value = `last_outfit`;
			input.autocomplete = 'off';
			input.spellcheck = false;

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
				restoreButton();
			};

			const cancel = () => {
				restoreButton();
			};

			input.addEventListener('keyup', (e) => {
				if (e.key === 'Enter') commit();
				else if (e.key === 'Escape') cancel();
			});

			input.addEventListener('blur', cancel);

			const restoreButton = () => {
				input.replaceWith(cacheButton);
			};

			cacheButton.replaceWith(input);
			input.focus();
			input.select();
		};

		const cacheButton = createButton(
			'system-tab-button cache-outfit-btn',
			'Cache Current Outfit',
			startCacheRename
		);

		contentArea.appendChild(cacheButton);
	}

	private cacheCurrentOutfit(key: string): void {
		const summary = this.outfitManager.createOutfitSummary();
		const cacheTree = this.outfitManager.getSnapshotsView();
		const slotMap = this.outfitManager.getVisibleSlotMap();
		cacheTree.writeSnapshot(key, slotMap);
		setGlobalVariable(key, summary);
		this.outfitManager.saveSettings();

		const gvar = `{{getglobalvar::${key}}}`;
		toastrClipboard(
			'success',
			gvar,
			`Cached current outfit.<br>Access with:<br>${gvar}.`,
			'ST Outfits'
		);
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