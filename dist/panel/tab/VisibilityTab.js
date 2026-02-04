import { toSummaryKey } from "../../util/SummaryHelper.js";
export class VisibilityTab {
    constructor(panel, formatKind) {
        this.panel = panel;
        this.formatKind = formatKind;
        this.outfitManager = this.panel.getOutfitManager();
    }
    render(contentArea) {
        this.renderPositionButtons(contentArea);
        this.renderPreviewButton(contentArea);
        this.renderVisibilityButtons(contentArea);
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
        for (const kind of this.outfitManager.getOutfitView().getSlotKinds()) {
            const section = this.createPreviewSection(this.formatKind(kind), toSummaryKey(kind));
            previewBody.appendChild(section);
        }
        const fullSummarySection = this.createPreviewSection('Full Summary', 'summary');
        previewBody.appendChild(fullSummarySection);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        overlay.querySelector('.outfit-preview-close-btn').addEventListener('click', () => {
            overlay.remove();
        });
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay)
                overlay.remove();
        });
    }
    createPreviewSection(header, summaryKey) {
        const section = document.createElement('div');
        section.classList.add('outfit-preview-section');
        const h4 = document.createElement('h4');
        h4.textContent = header;
        const code = document.createElement('code');
        code.textContent = `{{getglobalvar::${this.outfitManager.getVarName(summaryKey)}}}`;
        const details = document.createElement('details');
        details.classList.add('outfit-preview-details');
        const summary = document.createElement('summary');
        summary.textContent = 'Show summary';
        const pre = document.createElement('pre');
        pre.classList.add('outfit-preview-text');
        pre.textContent = this.outfitManager.getSummary(summaryKey);
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
}
function createButton(className, text, click) {
    const btn = document.createElement('button');
    btn.className = className;
    btn.textContent = text;
    if (click)
        btn.addEventListener('click', click);
    return btn;
}
function createDerivedToggleButton(className, predicate, getText, click) {
    const btn = document.createElement('button');
    btn.className = className;
    btn.textContent = getText(predicate());
    btn.addEventListener('click', (e) => {
        const enabled = predicate();
        click(enabled, e);
        btn.textContent = getText(enabled);
    });
    return btn;
}
