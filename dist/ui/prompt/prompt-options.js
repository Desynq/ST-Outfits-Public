import { el } from "../../util/ElementHelper.js";
export function promptOptions(message, options, label = String) {
    return new Promise(resolve => {
        const overlay = el('div', {
            className: 'sto-overlay show'
        });
        const modal = el('div', {
            className: 'outfit-option-modal'
        });
        const text = el('div', {
            text: message
        });
        const buttons = el('div', {
            className: 'outfit-option-buttons'
        });
        for (const option of options) {
            const button = el('button', {
                text: label(option),
                events: {
                    click: () => {
                        overlay.remove();
                        resolve(option);
                    }
                }
            });
            buttons.append(button);
        }
        const cancel = el('button', {
            text: 'Cancel',
            events: {
                click: () => {
                    overlay.remove();
                    resolve(null);
                }
            }
        });
        modal.append(text, buttons, cancel);
        overlay.append(modal);
        document.body.append(overlay);
    });
}
