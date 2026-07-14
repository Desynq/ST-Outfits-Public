import { createPanelsButton } from "../ui/components/button/panels-button.js";



export function initExtensionsMenu(): void {
	const extensionsMenu = document.getElementById('prompt_inspector_wand_container') ?? document.getElementById('extensionsMenu');
	if (!extensionsMenu) {
		throw new Error('Could not find the extensions menu');
	}

	extensionsMenu.classList.add('interactable');
	extensionsMenu.tabIndex = 0;

	const panelsButton = createPanelsButton();

	extensionsMenu.appendChild(panelsButton);
}