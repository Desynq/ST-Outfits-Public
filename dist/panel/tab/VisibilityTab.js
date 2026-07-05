import { assertNever } from "../../shared.js";
import { createButton, createDerivedToggleButton } from "../../util/element/ButtonHelper.js";
import { el } from "../../util/ElementHelper.js";
import { toSummaryKey } from "../../util/SummaryHelper.js";
import { CharOutfitPanel } from "../CharOutfitPanel.js";
import { PanelTab } from "./PanelTab.js";
export class VisibilityTab extends PanelTab {
    constructor(panel, formatKind) {
        super(panel);
        this.formatKind = formatKind;
    }
    render(contentArea) {
        contentArea.innerHTML = '';
        this.renderPositionButtons(contentArea);
        this.renderLoadSettings(contentArea);
        this.renderTagInputs(contentArea);
        this.renderPreviewButton(contentArea);
        this.renderVisibilityButtons(contentArea);
        this.renderThemeInputs(contentArea);
    }
    renderTagInputs(contentArea) {
        // only character panels can have a custom tag and attributes
        if (!(this.panel instanceof CharOutfitPanel))
            return;
        const settings = this.panel.getPanelSettings();
        const existing = settings.getFullSummaryTag();
        const wrapper = el('div', {
            className: 'panel-tag-config'
        });
        const tagInput = el('input', {
            className: 'panel-tag-input',
            type: 'text',
            placeholder: 'Tag - e.g., outfit, behavior',
            value: existing?.tag ?? ''
        });
        const attrInput = el('input', {
            className: 'panel-attr-input',
            type: 'text',
            placeholder: 'Attributes - e.g., character="John"',
            value: existing?.attributes ?? ''
        });
        const msgClassName = 'panel-tag-message';
        const messageEl = el('div', {
            className: msgClassName
        });
        const updateMsgEl = (text, className) => {
            messageEl.textContent = text;
            messageEl.className = `${msgClassName} ${className}`;
        };
        const resetBtn = el('button', {
            className: 'panel-tag-reset',
            text: 'Reset'
        });
        const apply = () => {
            const old = settings.getFullSummaryTag();
            if (old === undefined && tagInput.value === '' && attrInput.value === '') {
                return; // no change to default
            }
            if (tagInput.value === old?.tag && attrInput.value === old?.tag) {
                return; // no change
            }
            const result = settings.setFullSummaryTag(tagInput.value, attrInput.value);
            switch (result) {
                case 'ok':
                    updateMsgEl('✓ Tag updated', '--ok');
                    this.outfitManager.updateMacros();
                    this.panel.saveAndRender();
                    break;
                case 'invalid-tag-name':
                    updateMsgEl('Invalid tag name', '--error');
                    break;
                case 'has-xml-braces':
                    updateMsgEl('Attributes cannot contain < or >', '--error');
                    break;
                case 'invalid-attributes':
                    updateMsgEl('Invalid attribute format', '--error');
                    break;
                default: assertNever(result);
            }
        };
        tagInput.addEventListener('blur', apply);
        attrInput.addEventListener('blur', apply);
        resetBtn.addEventListener('click', () => {
            tagInput.value = '';
            attrInput.value = '';
            updateMsgEl('Preset to default', '--ok');
            settings.resetFullSummaryTag();
            this.outfitManager.updateMacros();
            this.panel.saveAndRender();
        });
        wrapper.append(el('label', { text: 'Panel Tag:' }), tagInput, el('label', { text: 'Panel Attributes:' }), attrInput, resetBtn, messageEl);
        contentArea.append(wrapper);
    }
    renderPreviewButton(contentArea) {
        const previewButton = document.createElement('button');
        previewButton.className = 'system-tab-button save-outfit-btn';
        previewButton.textContent = 'Preview Outfit (LLM)';
        previewButton.addEventListener('click', () => {
            this.showOutfitPreview();
        });
        contentArea.appendChild(previewButton);
    }
    showOutfitPreview() {
        const overlay = document.createElement('div');
        overlay.className = 'outfit-preview-overlay';
        const modal = document.createElement('div');
        modal.className = 'outfit-preview-modal';
        /*html*/
        modal.innerHTML = `
		<div class="outfit-preview-header">
			<h3>What the AI Sees</h3>
			<button class="outfit-preview-close-btn">✕</button>
		</div>
		<div class="outfit-preview-body"></div>
		`;
        const previewBody = modal.querySelector('.outfit-preview-body');
        const fullSummarySection = this.createPreviewSection('Full Summary', '*');
        previewBody.append(fullSummarySection);
        for (const kind of this.outfitManager.getOutfitView().getSlotKinds()) {
            const section = this.createPreviewSection(this.formatKind(kind), toSummaryKey(kind));
            previewBody.append(section);
        }
        overlay.append(modal);
        document.body.append(overlay);
        overlay.querySelector('.outfit-preview-close-btn').addEventListener('click', () => {
            overlay.remove();
        });
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay)
                overlay.remove();
        });
    }
    createPreviewSection(header, kindScope) {
        const section = document.createElement('div');
        section.classList.add('outfit-preview-section');
        const h4 = document.createElement('h4');
        h4.textContent = header;
        const code = document.createElement('code');
        code.textContent = `{{${this.outfitManager.getSummaryKey(kindScope)}}}`;
        const details = document.createElement('details');
        details.classList.add('outfit-preview-details');
        const summary = document.createElement('summary');
        summary.textContent = 'Show summary';
        const pre = document.createElement('pre');
        pre.classList.add('outfit-preview-section-text');
        pre.textContent = this.outfitManager.getSummary(kindScope) ?? 'None';
        details.appendChild(summary);
        details.appendChild(pre);
        section.appendChild(h4);
        section.appendChild(code);
        section.appendChild(details);
        return section;
    }
    renderVisibilityButtons(contentArea) {
        const hideDisabledButton = createButton('system-tab-button hide-disabled-button', this.panel.areDisabledSlotsHidden() ? 'Show Disabled Slots' : 'Hide Disabled Slots', () => this.panel.toggleHideDisabled());
        const hideEmptyButton = createButton('system-tab-button hide-empty-button', this.panel.areEmptySlotsHidden() ? 'Show Empty Slots' : 'Hide Empty Slots', () => this.panel.toggleHideEmpty());
        contentArea.append(hideDisabledButton, hideEmptyButton);
    }
    renderPositionButtons(contentArea) {
        const panelSettings = this.panel.getPanelSettings();
        if (this.panel instanceof CharOutfitPanel) {
            return;
        }
        const toggleSavingXYButton = createDerivedToggleButton('visibility-tab-button toggle-saving-xy-button', () => panelSettings.isXYSaved(), (enabled) => enabled
            ? 'Disable Saving XY'
            : 'Enable Saving XY', (enabled) => {
            panelSettings.setXYSaving(!enabled);
            this.outfitManager.saveSettings();
        });
        contentArea.append(toggleSavingXYButton);
    }
    renderLoadSettings(contentArea) {
        const panelSettings = this.panel.getPanelSettings();
        const wrapper = document.createElement('label');
        wrapper.className = 'visibility-load-state-row';
        const label = document.createElement('span');
        label.textContent = 'Load outfit from';
        const select = document.createElement('select');
        select.className = 'visibility-load-state-select';
        const options = [
            { value: 'chat', label: 'Chat' },
            { value: 'global', label: 'Global' }
        ];
        if (this.panel instanceof CharOutfitPanel) {
            options.push({ value: 'character', label: 'Character' });
        }
        for (const option of options) {
            el('option', {
                value: option.value,
                text: option.label,
                parent: select
            });
        }
        const current = panelSettings.getLoadState();
        select.value = options.some(option => option.value === current)
            ? current
            : 'chat';
        select.addEventListener('change', async () => {
            const next = select.value;
            panelSettings.setLoadState(next);
            this.outfitManager.saveSettings();
        });
        wrapper.append(label, select);
        contentArea.append(wrapper);
    }
    renderThemeInputs(contentArea) {
        const panelSettings = this.panel.getPanelSettings();
        const container = document.createElement('div');
        container.className = 'visibility-theme-section';
        const makeColorInput = (labelText, key, value) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'visibility-theme-row';
            const label = document.createElement('label');
            label.textContent = labelText;
            const input = document.createElement('input');
            input.type = 'color';
            input.value = value;
            let pendingValue = input.value;
            input.addEventListener('input', () => {
                pendingValue = input.value;
                panelSettings.setColor(key, pendingValue);
                this.panel.applyTheme(); // preview
            });
            input.addEventListener('blur', () => {
                this.outfitManager.saveSettings(); // commit
            });
            wrapper.append(label, input);
            return wrapper;
        };
        container.append(makeColorInput('Background 1', 'bgColor1', panelSettings.bgColor1), makeColorInput('Background 2', 'bgColor2', panelSettings.bgColor2), makeColorInput('Border', 'borderColor', panelSettings.borderColor));
        contentArea.appendChild(container);
    }
}
