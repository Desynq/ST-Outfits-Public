import { CharOutfitPanel } from "../../../panel/CharOutfitPanel.js";
import { OutfitPanel } from "../../../panel/OutfitPanel.js";
import { IPanelGrouper } from "../../../panel/PanelRegistry.js";
import { el } from "../../../util/ElementHelper.js";


interface PanelSwitcherOptions {
	currentPanel: OutfitPanel,
	grouper: IPanelGrouper;
}

export function createPanelSwitcher({
	currentPanel,
	grouper
}: PanelSwitcherOptions): HTMLDivElement {

	const button = el('span', {
		className: 'outfit-action switch-panel-button no-highlight',
		text: '▼',
		events: {
			click: (): void => {
				openMenu();
			}
		}
	});

	const menu = el('div', {
		className: 'panel-switch-menu'
	});

	const rebuildMenu = (): void => {
		const panels = grouper.getGroup(currentPanel);

		const optionEls = panels.map(panel => {
			const loadState = panel.getPanelSettings().getLoadState();

			const lock = el('span', {
				className: `panel-switch-lock`,
				text: {
					'chat': '📖',
					'global': '🌐',
					'character': '👤'
				}[loadState]
			});
			// lock.classList.toggle('is-hidden', canLoad);

			const label = el('span', {
				className: 'panel-switch-label',
				text: panel.getHeaderTitle()
			});

			const option = el('div', {
				className: 'panel-switch-option',
				events: {
					click: (): void => {
						menu.classList.remove('--open');
						grouper.focus(panel);
						panel.setMinimize(false);
					}
				},
				children: [lock, label]
			});

			option.classList.toggle('is-current-panel', panel === currentPanel);

			const s = panel.getPanelSettings();
			option.style.setProperty('--panel-bg-1', s.bgColor1);
			option.style.setProperty('--panel-bg-2', s.bgColor2);
			option.style.setProperty('--panel-border', s.borderColor);

			return option;
		});

		menu.replaceChildren(...optionEls);
	};

	button.addEventListener('click', rebuildMenu);


	const positionMenu = (): void => {
		menu.style.left = '0px';
		menu.style.right = 'auto';

		const menuRect = menu.getBoundingClientRect();
		const panelRect = currentPanel.getBoundingClientRect();
		const overflowRight = menuRect.right - panelRect.right;

		if (overflowRight > 0) {
			menu.style.left = `${-overflowRight - 8}px`;
		}

		const adjustedRect = menu.getBoundingClientRect();
		if (adjustedRect.left < 8) {
			menu.style.left = `${parseFloat(menu.style.left || '0') + (8 - adjustedRect.left)}px`;
		}
	};

	const openMenu = (): void => {
		rebuildMenu();
		menu.classList.toggle('--open');
		positionMenu();
	};



	const dropdown = el('div', {
		className: 'panel-switch-dropdown',
		tabIndex: 0,
		children: [button, menu],
		events: {
			focusout: () => {
				menu.classList.remove('--open');
				menu.replaceChildren();
			}
		}
	});

	const groupFocus = (panel: OutfitPanel): void => {
		if (panel !== currentPanel) return;
		dropdown.hidden = false;
	};

	grouper.onGroupFocus(currentPanel.outfitManager.getName(), groupFocus);

	if (grouper.getGroup(currentPanel).length <= 1) {
		dropdown.hidden = true;
	}

	return dropdown;
}