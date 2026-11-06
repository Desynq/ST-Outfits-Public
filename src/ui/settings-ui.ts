import { OutfitTrackerModel } from "../data/model/Outfit.js";
import { TraitManager } from "../manager/TraitManager.js";
import { RecontextualizeOptions } from "../panel/PanelRegistry.js";
import { el } from "../util/ElementHelper.js";
import { promptConfigureSlotIcons } from "./prompt/configure-slot-icons.js";
import { promptConfigureTraits } from "./prompt/configure-traits.js";
import { promptTraitPreview } from "./prompt/trait-preview.js";

interface AutoOutfitSystemLike {
	enable(): unknown;
	disable(): unknown;
	setPrompt(prompt: string): unknown;
	resetToDefaultPrompt(): string;
	getStatus(): { promptLength: number; };
	systemPrompt: string;
}

interface SettingsUIOptions {
	settings: OutfitTrackerModel;
	saveSettings: () => void;
	autoOutfitSystem?: AutoOutfitSystemLike;
	sendSystemMessage: (message: string) => void;
	refreshActivePanel: () => void;
	recontextualize: (options: RecontextualizeOptions) => void;
}

export function createSettingsUI({
	settings,
	saveSettings,
	autoOutfitSystem,
	sendSystemMessage,
	refreshActivePanel,
	recontextualize
}: SettingsUIOptions): void {

	function checkboxSetting(
		label: string,
		checked: boolean,
		onChange: (checked: boolean) => void
	): HTMLDivElement {
		return el('div', {
			className: 'flex-container',
			children: [
				el('label', { text: label }),
				el('input', {
					type: 'checkbox',
					checked,
					events: {
						change() {
							onChange(this.checked);
						}
					}
				})
			]
		});
	}

	function settingsButton(
		label: string,
		onClick: () => void | Promise<void>
	): HTMLButtonElement {
		return el('button', {
			className: 'menu_button',
			type: 'button',
			text: label,
			events: {
				click() {
					void onClick();
				}
			}
		});
	}

	const content = el('div', {
		className: 'inline-drawer-content',
		children: [
			checkboxSetting(
				'Enable system messages',
				settings.enableSysMessages,
				value => {
					settings.enableSysMessages = value;
					saveSettings();
				}
			),

			checkboxSetting(
				'Auto-open character panel',
				settings.autoOpenBot,
				value => {
					settings.autoOpenBot = value;
					saveSettings();
				}
			),

			checkboxSetting(
				'Auto-open user panel',
				settings.autoOpenUser,
				value => {
					settings.autoOpenUser = value;
					saveSettings();
				}
			),

			el('div', {
				className: 'flex-container',
				children: [
					settingsButton('Configure Slot Icons', async () => {
						await promptConfigureSlotIcons({
							onSave: () => {
								saveSettings();
								refreshActivePanel();
							}
						});
					})
				]
			}),


			el('div', {
				className: 'flex-container',
				children: [
					settingsButton('Configure Slot Traits', async () => {
						await promptConfigureTraits({
							onSave: () => {
								saveSettings();

								recontextualize({
									allPanels: true,
									filter: slot => slot.type === 'traits'
								});

								TraitManager.updateMacros();

								refreshActivePanel();
							}
						});
					}),

					settingsButton('Preview Trait Context (LLM)', () => {
						promptTraitPreview();
					})
				]
			})

		]
	});

	if (autoOutfitSystem) {
		const promptInput = el('textarea', {
			rows: 6,
			placeholder: 'Enter system prompt for auto outfit detection',
			// @ts-ignore
			value: settings.autoOutfitPrompt ?? '',
			events: {
				change() {
					// @ts-ignore
					settings.autoOutfitPrompt = this.value;
					autoOutfitSystem.setPrompt(this.value);
					saveSettings();
				}
			}
		});

		content.append(
			checkboxSetting(
				'Enable auto outfit updates',
				// @ts-ignore
				settings.autoOutfitSystem,
				enabled => {
					// @ts-ignore
					settings.autoOutfitSystem = enabled;

					if (enabled) {
						autoOutfitSystem.enable();
					} else {
						autoOutfitSystem.disable();
					}

					saveSettings();
				}
			),

			el('div', {
				className: 'flex-container',
				children: [
					el('label', { text: 'System Prompt:' }),
					promptInput
				]
			}),

			el('div', {
				className: 'flex-container',
				children: [
					settingsButton('Reset to Default Prompt', () => {
						const message = autoOutfitSystem.resetToDefaultPrompt();

						promptInput.value = autoOutfitSystem.systemPrompt;
						// @ts-ignore
						settings.autoOutfitPrompt = promptInput.value;
						saveSettings();

						if (settings.enableSysMessages) {
							sendSystemMessage(message);
						} else {
							toastr.info(message);
						}
					}),

					settingsButton('View Current Prompt', () => {
						const status = autoOutfitSystem.getStatus();
						const prompt = autoOutfitSystem.systemPrompt;

						const preview = prompt.length > 100
							? prompt.substring(0, 100) + '...'
							: prompt;

						toastr.info(
							`Prompt preview: ${preview}\n\nFull length: ${status.promptLength} characters`,
							'Current System Prompt',
							{
								timeOut: 15000,
								extendedTimeOut: 30000
							}
						);
					})
				]
			})
		);
	} else {
		content.append(
			el('div', {
				className: 'flex-container',
				children: [
					el('label', {
						text: 'Auto Outfit System: Not Available'
					})
				]
			})
		);
	}

	const root = el('div', {
		className: 'outfit-extension-settings',
		children: [
			el('div', {
				className: 'inline-drawer',
				children: [
					el('div', {
						className: 'inline-drawer-toggle inline-drawer-header',
						children: [
							el('b', {
								text: 'Outfit Tracker Settings'
							}),
							el('div', {
								className: 'inline-drawer-icon fa-solid fa-circle-chevron-down down'
							})
						]
					}),
					content
				]
			})
		]
	});

	document.querySelector('#extensions_settings')?.append(root);
}
