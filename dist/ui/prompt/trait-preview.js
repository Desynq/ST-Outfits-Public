import { TraitManager } from "../../manager/TraitManager.js";
import { el } from "../../util/ElementHelper.js";
export function promptTraitPreview() {
    const overlay = el('div', {
        className: 'outfit-preview-overlay'
    });
    const modal = el('div', {
        className: 'outfit-preview-modal',
        parent: overlay
    });
    const header = el('div', {
        className: 'outfit-preview-header',
        parent: modal
    });
    el('h3', {
        text: 'What the AI Sees: Traits',
        parent: header
    });
    const close = () => overlay.remove();
    el('button', {
        className: 'outfit-preview-close-btn',
        text: '✕',
        parent: header,
        events: { click: close }
    });
    const body = el('div', {
        className: 'outfit-preview-body',
        parent: modal
    });
    const section = el('div', {
        className: 'outfit-preview-section',
        parent: body
    });
    el('h4', {
        text: 'Trait Definitions',
        parent: section
    });
    el('code', {
        text: `{{${TraitManager.getSummaryKey('*')}}}`,
        parent: section
    });
    const details = el('details', {
        className: 'outfit-preview-details',
        parent: section
    });
    el('summary', {
        text: 'Show summary',
        parent: details
    });
    el('pre', {
        className: 'outfit-preview-section-text',
        text: TraitManager.getSummary('*') ?? 'None',
        parent: details
    });
    overlay.addEventListener('click', event => {
        if (event.target === overlay)
            close();
    });
    document.body.append(overlay);
}
