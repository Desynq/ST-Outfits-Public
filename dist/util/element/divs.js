import { createElement } from "../ElementHelper.js";
export function createOverlayElement(className, onClick) {
    const overlay = createElement('div', className);
    overlay.classList.add('sto-overlay');
    if (onClick) {
        overlay.addEventListener('click', (e) => onClick(overlay, e));
    }
    return overlay;
}
