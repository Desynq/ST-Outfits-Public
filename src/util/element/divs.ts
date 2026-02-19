import { createElement } from "../ElementHelper.js";



export function createOverlayElement(
	className?: string,
	onClick?: (overlay: HTMLDivElement, e: MouseEvent) => void
): HTMLDivElement {
	const overlay = createElement('div', className);
	overlay.classList.add('sto-overlay');

	if (onClick) {
		overlay.addEventListener('click', (e) => onClick(overlay, e));
	}
	return overlay;
}