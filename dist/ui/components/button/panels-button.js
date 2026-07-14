import { el } from "../../../util/ElementHelper.js";
export function createPanelsButton() {
    const button = el('div', {
        id: 'outfit-panels-button',
        className: 'list-group-item flex-container flexGap5 interactable',
        tabIndex: 0,
        title: `View lore panels`
    });
    const icon = el('i', {
        className: 'fa-solid fa-book-bookmark'
    });
    button.append(icon);
    const textSpan = el('span', {
        text: 'View Lore Panels'
    });
    button.append(textSpan);
    return button;
}
