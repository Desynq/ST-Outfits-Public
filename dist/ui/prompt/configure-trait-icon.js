import { el } from '../../util/ElementHelper.js';
export function promptConfigureTraitIcon(current) {
    return new Promise(resolve => {
        const currentIcon = current?.type === 'font-awesome'
            ? current
            : null;
        const overlay = el('div', {
            className: 'sto-overlay show'
        });
        const modal = el('div', {
            className: 'outfit-option-modal trait-icon-config',
            role: 'dialog',
            ariaModal: 'true',
            parent: overlay
        });
        el('h3', {
            text: 'Configure Trait Icon',
            parent: modal
        });
        const previewContainer = el('div', {
            className: 'trait-icon-config-preview',
            parent: modal
        });
        const preview = el('i', {
            className: currentIcon?.className || 'fa-solid fa-tag',
            parent: previewContainer
        });
        const classInput = el('input', {
            type: 'text',
            value: currentIcon?.className ?? '',
            placeholder: 'Font Awesome class (e.g. fa-solid fa-heart)',
            parent: modal
        });
        const colorRow = el('div', {
            className: 'trait-icon-config-color',
            parent: modal
        });
        const useColor = el('input', {
            type: 'checkbox',
            checked: currentIcon?.color != null,
            parent: colorRow
        });
        el('span', {
            text: 'Custom color',
            parent: colorRow
        });
        const colorInput = el('input', {
            type: 'color',
            value: currentIcon?.color?.match(/^#[0-9a-f]{6}$/i)
                ? currentIcon.color
                : '#ffffff',
            parent: colorRow
        });
        const updatePreview = () => {
            preview.className = classInput.value.trim() || 'fa-solid fa-tag';
            preview.style.color = useColor.checked
                ? colorInput.value
                : '';
            colorInput.disabled = !useColor.checked;
        };
        classInput.addEventListener('input', updatePreview);
        colorInput.addEventListener('input', updatePreview);
        useColor.addEventListener('change', updatePreview);
        updatePreview();
        const buttons = el('div', {
            className: 'trait-config-buttons',
            parent: modal
        });
        let closed = false;
        const close = (result) => {
            if (closed)
                return;
            closed = true;
            overlay.remove();
            resolve(result);
        };
        el('button', {
            text: 'Clear',
            parent: buttons,
            events: {
                click: () => close(null)
            }
        });
        el('button', {
            text: 'Cancel',
            parent: buttons,
            events: {
                click: () => close(undefined)
            }
        });
        const saveButton = el('button', {
            text: 'Save',
            parent: buttons,
            events: {
                click: () => {
                    const className = classInput.value.trim();
                    if (!className)
                        return;
                    close({
                        type: 'font-awesome',
                        className,
                        color: useColor.checked
                            ? colorInput.value
                            : null
                    });
                }
            }
        });
        const updateSaveState = () => {
            saveButton.disabled = !classInput.value.trim();
        };
        classInput.addEventListener('input', updateSaveState);
        updateSaveState();
        overlay.addEventListener('click', event => {
            if (event.target === overlay) {
                close(undefined);
            }
        });
        document.body.append(overlay);
        classInput.focus();
    });
}
