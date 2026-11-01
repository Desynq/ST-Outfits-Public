
import { el } from '../../util/ElementHelper.js';
import { CHARACTER_NOTE_OPTIONS } from '../../Constants.js';
import type { CharacterNoteType } from '../../Constants.js';

export type SlotIconRule =
	| {
		type: CharacterNoteType;
		keywords: string[];
		icon?: never;
	}
	| {
		icon: string;
		keywords: string[];
		type?: never;
	};

interface SlotIconModalOptions {
	settings: readonly SlotIconRule[];
	defaultSettings: readonly SlotIconRule[];
	save: (settings: SlotIconRule[]) => void | Promise<void>;
}

export async function promptConfigureSlotIcons({
	settings,
	defaultSettings,
	save,
}: SlotIconModalOptions): Promise<void> {
	const clone = (rules: readonly SlotIconRule[]): SlotIconRule[] =>
		rules.map(rule => ({
			...rule,
			keywords: [...rule.keywords],
		}));

	let rules = clone(settings);

	const overlay = el('div', {
		className: 'sto-overlay show',
	});

	const modal = el('div', {
		className: 'outfit-option-modal slot-icon-config',
		role: 'dialog',
		ariaModal: 'true',
	});

	const title = el('h3', {
		text: 'Configure Slot Icons',
	});

	const list = el('div', {
		className: 'slot-icon-config-list',
	});

	const buttons = el('div', {
		className: 'slot-icon-config-buttons',
	});

	function render(): void {
		list.replaceChildren();

		rules.forEach((rule, index) => {
			const iconClass = rule.type
				? CHARACTER_NOTE_OPTIONS[rule.type].icon
				: rule.icon;

			const icon = el('i', {
				className: iconClass,
			});

			const keywords = el('textarea', {
				rows: 1,
				className: 'text_pole',
				placeholder: 'Keywords (comma-separated)',
				value: rule.keywords.join(', '),
				events: {
					input() {
						rule.keywords = this.value
							.split(',')
							.map(value => value.trim().toLowerCase())
							.filter(Boolean);
					},
				},
			});

			const up = el('button', {
				type: 'button',
				className: 'menu_button',
				text: '↑',
				title: 'Move up',
				disabled: index === 0,
				events: {
					click() {
						[rules[index - 1], rules[index]] =
							[rules[index], rules[index - 1]];

						render();
					},
				},
			});

			const down = el('button', {
				type: 'button',
				className: 'menu_button',
				text: '↓',
				title: 'Move down',
				disabled: index === rules.length - 1,
				events: {
					click() {
						[rules[index + 1], rules[index]] =
							[rules[index], rules[index + 1]];

						render();
					},
				},
			});

			const remove = el('button', {
				type: 'button',
				className: 'menu_button',
				text: '×',
				title: 'Remove rule',
				events: {
					click() {
						rules.splice(index, 1);
						render();
					},
				},
			});

			const row = el('div', {
				className: 'slot-icon-config-row',
				children: [
					icon,
					keywords,
					up,
					down,
					remove,
				],
			});

			list.append(row);
		});
	}

	render();

	const addCustomIcon = el('button', {
		type: 'button',
		className: 'menu_button',
		text: '+ Add Custom Icon',
		events: {
			click() {
				const icon = prompt(
					'Font Awesome icon class:',
					'fa-solid fa-heart'
				)?.trim();

				if (!icon) return;

				const input = prompt(
					'Keywords (comma-separated):'
				);

				if (input === null) return;

				const keywords = input
					.split(',')
					.map(value => value.trim().toLowerCase())
					.filter(Boolean);

				if (!keywords.length) return;

				rules.push({ icon, keywords });
				render();
			},
		},
	});

	const reset = el('button', {
		type: 'button',
		className: 'menu_button',
		text: 'Reset',
		events: {
			click() {
				rules = clone(defaultSettings);
				render();
			},
		},
	});

	const saveButton = el('button', {
		type: 'button',
		className: 'menu_button',
		text: 'Save',
	});

	const cancel = el('button', {
		type: 'button',
		className: 'menu_button',
		text: 'Cancel',
	});

	buttons.append(addCustomIcon, reset, saveButton, cancel);
	modal.append(title, list, buttons);
	overlay.append(modal);

	return new Promise<void>((resolve, reject) => {
		let closed = false;
		let saving = false;

		function close(): void {
			if (closed) return;

			closed = true;
			document.removeEventListener('keydown', onKeyDown);
			overlay.remove();
			resolve();
		}

		function onKeyDown(event: KeyboardEvent): void {
			if (event.key === 'Escape' && !saving) {
				event.preventDefault();
				close();
			}
		}

		document.addEventListener('keydown', onKeyDown);

		cancel.addEventListener('click', () => {
			if (!saving) close();
		});

		overlay.addEventListener('click', event => {
			if (event.target === overlay && !saving) {
				close();
			}
		});

		saveButton.addEventListener('click', async () => {
			if (saving || closed) return;

			saving = true;
			saveButton.disabled = true;
			cancel.disabled = true;
			reset.disabled = true;

			try {
				await save(clone(rules));
				close();
			} catch (error) {
				saving = false;
				saveButton.disabled = false;
				cancel.disabled = false;
				reset.disabled = false;

				console.error('Failed to save slot icon rules:', error);
				toastr.error('Failed to save slot icon rules.');
			}
		});

		document.body.append(overlay);
	});
}
