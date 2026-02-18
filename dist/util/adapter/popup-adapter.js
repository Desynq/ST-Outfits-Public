import { POPUP_RESULT, POPUP_TYPE, Popup } from '../../../../../../popup.js';
export async function popupConfirm(content, options = {}) {
    const config = {
        title: '',
        okText: 'OK',
        cancelText: 'Cancel',
        wide: false,
        large: false,
        leftAlign: false,
        ...options
    };
    const popup = new Popup(content, POPUP_TYPE.CONFIRM, config.title, {
        okButton: config.okText,
        cancelButton: config.cancelText,
        wide: config.wide,
        large: config.large,
        leftAlign: config.leftAlign,
    });
    const result = await popup.show();
    return result === POPUP_RESULT.AFFIRMATIVE;
}
export async function multiConfirm(...messages) {
    for (const message of messages) {
        const confirm = await popupConfirm(message);
        if (!confirm)
            return false;
    }
    return true;
}
