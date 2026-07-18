import { popupConfirm } from "../../util/adapter/popup-adapter.js";
import { el } from "../../util/ElementHelper.js";
export async function promptImageResize({ slot, imgWrapper, userWidth, userHeight, saveImageResize, completeResize }) {
    const image = slot.getActiveImageState();
    if (!image) {
        throw new Error('Attempted resizing undefined image.');
    }
    const content = el('div', {
        className: 'resize-prompt-content'
    });
    const inputsRow = el('div', {
        className: 'inputs-row',
        parent: content
    });
    const actionsRow = el('div', {
        className: 'actions-row',
        parent: content
    });
    const renderInput = (text, value) => {
        const div = el('div', {
            className: 'input-div',
            parent: inputsRow
        });
        const caption = el('div', {
            text: text,
            parent: div
        });
        const input = el('input', {
            type: 'number',
            value: value.toString(),
            min: '24',
            max: '1024',
            step: '12',
            parent: div
        });
        return input;
    };
    const widthInput = renderInput('Width', userWidth);
    const heightInput = renderInput('Height', userHeight);
    const matchAspectRatio = () => {
        const width = Number(widthInput.value);
        const height = Math.round(width * image.ref.height / image.ref.width);
        heightInput.value = height.toString();
    };
    const applyResize = async () => {
        const width = Number(widthInput.value);
        const height = Number(heightInput.value);
        if (!width || !height)
            return;
        await saveImageResize(width, height);
        completeResize();
    };
    const renderWidthPreset = (width) => {
        el('button', {
            className: 'menu_button',
            text: `${width}px`,
            events: {
                click: async () => {
                    widthInput.value = width.toString();
                    matchAspectRatio();
                    await popupRef.completeAffirmative();
                }
            },
            parent: actionsRow
        });
    };
    el('button', {
        className: 'menu_button',
        text: '⇅ Fit Height',
        events: {
            click: () => matchAspectRatio()
        },
        parent: actionsRow
    });
    renderWidthPreset(48);
    renderWidthPreset(96);
    renderWidthPreset(128);
    renderWidthPreset(196);
    renderWidthPreset(256);
    let popupRef;
    const confirmed = await popupConfirm(content, {
        title: 'Resize Image',
        okText: 'Apply',
        onOpen: (popup) => {
            popupRef = popup;
        }
    });
    if (!confirmed)
        return;
    await applyResize();
}
