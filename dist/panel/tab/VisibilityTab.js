export class VisibilityTab {
    constructor(outfitManager, formatKind) {
        this.outfitManager = outfitManager;
        this.formatKind = formatKind;
    }
    render(contentArea) {
        this.renderPreviewButton(contentArea);
    }
    renderPreviewButton(contentArea) {
        const previewButton = document.createElement('button');
        previewButton.className = 'save-outfit-btn';
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
            const section = this.createPreviewSection(this.formatKind(kind), kind + '_summary');
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
    createPreviewSection(header, namespace) {
        const section = document.createElement('div');
        section.classList.add('outfit-preview-section');
        const h4 = document.createElement('h4');
        h4.textContent = header;
        const code = document.createElement('code');
        code.textContent = `{{getglobalvar::${this.outfitManager.getVarName(namespace)}}}`;
        const details = document.createElement('details');
        details.classList.add('outfit-preview-details');
        const summary = document.createElement('summary');
        summary.textContent = 'Show summary';
        const pre = document.createElement('pre');
        pre.classList.add('outfit-preview-text');
        pre.textContent = this.outfitManager.getSummary(namespace);
        details.appendChild(summary);
        details.appendChild(pre);
        section.appendChild(h4);
        section.appendChild(code);
        section.appendChild(details);
        return section;
    }
}
