import { createButton, createDerivedToggleButton } from "../../util/element/ButtonHelper.js";
import { toSummaryKey } from "../../util/SummaryHelper.js";
import { PanelTab } from "./PanelTab.js";
export class VisibilityTab extends PanelTab {
    constructor(panel, formatKind) {
        super(panel);
        this.formatKind = formatKind;
    }
    render(contentArea) {
        contentArea.innerHTML = '';
        this.renderPositionButtons(contentArea);
        this.renderPreviewButton(contentArea);
        this.renderVisibilityButtons(contentArea);
        this.renderThemeInputs(contentArea);
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
        const toggleSavingXYButton = createDerivedToggleButton('visibility-tab-button toggle-saving-xy-button', () => panelSettings.isXYSaved(), (enabled) => enabled
            ? 'Disable Saving XY'
            : 'Enable Saving XY', (enabled) => {
            panelSettings.setXYSaving(!enabled);
            this.panel.saveAndRender();
        });
        contentArea.append(toggleSavingXYButton);
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
