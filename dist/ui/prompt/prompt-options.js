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
export function confirmScroll(message, content, options = {}) {
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
        const scroll = el('pre', {
            className: 'outfit-confirm-scroll',
            text: content
        });
        const buttons = el('div', {
            className: 'outfit-option-buttons'
        });
        const confirm = el('button', {
            text: options.confirmText ?? 'Confirm',
            events: {
                click: () => {
                    overlay.remove();
                    resolve(true);
                }
            }
        });
        const cancel = el('button', {
            text: options.cancelText ?? 'Cancel',
            events: {
                click: () => {
                    overlay.remove();
                    resolve(false);
                }
            }
        });
        buttons.append(confirm, cancel);
        modal.append(text, scroll, buttons);
        overlay.append(modal);
        document.body.append(overlay);
    });
}
export function confirmChanges(message, changes, options = {}) {
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
        const scroll = el('div', {
            className: 'outfit-confirm-scroll'
        });
        const table = el('table', {
            className: 'outfit-confirm-table'
        });
        const thead = el('thead');
        thead.append(el('tr', {
            children: [
                el('th', { text: 'Old' }),
                el('th', { text: 'New' }),
            ]
        }));
        const tbody = el('tbody');
        for (const [oldValue, newValue] of changes) {
            tbody.append(el('tr', {
                children: [
                    el('td', { text: oldValue }),
                    el('td', { text: newValue }),
                ]
            }));
        }
        table.append(thead, tbody);
        scroll.append(table);
        const buttons = el('div', {
            className: 'outfit-option-buttons'
        });
        const confirm = el('button', {
            text: options.confirmText ?? 'Confirm',
            events: {
                click: () => {
                    overlay.remove();
                    resolve(true);
                }
            }
        });
        const cancel = el('button', {
            text: options.cancelText ?? 'Cancel',
            events: {
                click: () => {
                    overlay.remove();
                    resolve(false);
                }
            }
        });
        buttons.append(confirm, cancel);
        modal.append(text, scroll, buttons);
        overlay.append(modal);
        document.body.append(overlay);
    });
}
