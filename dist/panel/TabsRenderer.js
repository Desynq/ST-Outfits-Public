import { assertNever } from "../shared.js";
import { ElementHelper } from "../util/ElementHelper.js";
export class OutfitTabsRenderer {
    constructor(panel) {
        this.panel = panel;
        this.currentTab = 'clothing';
        this.draggedTab = null;
    }
    get outfitManager() {
        return this.panel.getOutfitManager();
    }
    get outfitView() {
        return this.outfitManager.getOutfitView();
    }
    renderTabs(tabsContainer, contentArea) {
        this.recreateTabs(tabsContainer);
        contentArea.innerHTML = '';
        switch (this.currentTab) {
            case 'outfits':
                this.renderOutfitsTab(contentArea);
                break;
            default:
                const slots = this.outfitManager.getOutfitView().slots
                    .filter(s => s.kind === this.currentTab)
                    .map(s => s.id);
                if (slots.length === 0) { // fallback
                    tabsContainer.querySelector('button[data-tab="outfits"]')?.click();
                    return;
                }
                this.panel.getSlotsRenderer().renderSlots(this.currentTab, slots, contentArea);
                break;
        }
    }
    recreateTabs(tabsContainer) {
        const preservedTabScroll = this.getTabScroll(tabsContainer);
        tabsContainer.innerHTML = '';
        const tabs = [];
        const kinds = this.outfitView.getSlotKinds();
        for (const kind of kinds) {
            const tab = this.createTab(kind);
            tabs.push(tab);
        }
        const outfitsTab = this.createTab('outfits');
        tabs.push(outfitsTab);
        const tabList = document.createElement('div');
        tabList.classList.add('outfit-tab-list');
        for (const tab of tabs) {
            tab.addEventListener('click', () => {
                this.changeTab(tabs, tab);
            });
            this.addDragCapabilityToTab(tab);
            if (tab !== outfitsTab) {
                ElementHelper.addContextActionListener(tab, () => {
                    if (!tab.classList.contains('active'))
                        return; // user can only rename current tab
                    const result = this.renameTab(tab);
                    if (result.status === 'renamed') {
                        this.currentTab = result.newName;
                        this.panel.saveAndRenderContent();
                    }
                });
                tabList.appendChild(tab);
            }
        }
        tabsContainer.appendChild(tabList);
        tabsContainer.appendChild(outfitsTab);
        tabsContainer.appendChild(this.createAddTabButton());
        requestAnimationFrame(() => {
            tabList.scrollLeft = preservedTabScroll;
        });
    }
    getTabScroll(tabsContainer) {
        const tabList = tabsContainer.querySelector('.outfit-tab-list');
        return tabList ? tabList.scrollLeft : 0;
    }
    assertTabKind(tab) {
        const tabName = tab.dataset.tab;
        if (tabName === undefined)
            throw new Error(`Tab has no name.`);
        return tabName;
    }
    changeTab(tabs, tab) {
        const tabName = tab.dataset.tab;
        if (tabName === undefined)
            throw new Error(`Tab has no name.`);
        this.currentTab = tabName;
        this.panel.renderContent();
        for (const t of tabs) {
            t.classList.remove('active');
        }
        tab.classList.add('active');
    }
    renameTab(tab) {
        const kind = this.assertTabKind(tab);
        const newKind = this.promptKind();
        if (newKind === null)
            return { status: 'cancelled', newName: null }; // user cancelled
        const result = this.outfitView.renameKind(kind, newKind);
        switch (result) {
            case "invalid-new-kind":
                this.panel.sendSystemMessage(`Kind "${newKind}" is invalid.`);
                return { status: 'rejected', newName: null };
            case "old-kind-not-found":
                throw new Error(`Tab has kind "${kind}" that does not exist for the current outfit.`);
            case "new-kind-already-exists":
                this.panel.sendSystemMessage(`Kind ${newKind} already exists.`);
                return { status: 'rejected', newName: null };
            case "renamed":
                return { status: 'renamed', newName: newKind };
            default: assertNever(result);
        }
    }
    promptKind() {
        const message = `Rules:
• Use lowercase letters only
• Hyphens (-) separate words
• Underscore (_) capitalizes the next letter
• No numbers or special characters
• Cannot start or end words with _
• Cannot start or end with -
• "outfits" is reserved and cannot be used

New slot kind name:`;
        const raw = prompt(message)?.trim();
        if (raw === undefined || raw === '')
            return null;
        return this.normalizeKindInput(raw);
    }
    addDragCapabilityToTab(tab) {
        tab.addEventListener('dragstart', () => {
            this.draggedTab = tab;
            tab.classList.add('dragging');
        });
        tab.addEventListener('dragend', () => {
            this.draggedTab = null;
            tab.classList.remove('dragging');
        });
        tab.addEventListener('dragover', (e) => {
            e.preventDefault(); // required for drop
        });
        tab.addEventListener('drop', (e) => {
            e.preventDefault();
            if (!this.draggedTab || this.draggedTab === tab)
                return;
            const list = tab.parentElement;
            const draggedIndex = [...list.children].indexOf(this.draggedTab);
            const targetIndex = [...list.children].indexOf(tab);
            if (draggedIndex < targetIndex) {
                list.insertBefore(this.draggedTab, tab.nextSibling);
            }
            else {
                list.insertBefore(this.draggedTab, tab);
            }
            this.commitTabOrder(list);
        });
    }
    commitTabOrder(tabList) {
        const kindOrder = [];
        for (const child of tabList.children) {
            const el = child;
            const kind = el.dataset.kind;
            if (kind) {
                kindOrder.push(kind);
            }
        }
        this.outfitManager
            .getOutfitView()
            .sortByKind(kindOrder);
        this.panel.saveAndRenderContent();
    }
    createTab(name) {
        const tab = document.createElement('button');
        tab.classList.add('outfit-tab');
        if (this.currentTab === name) {
            tab.classList.add('active');
        }
        tab.dataset.tab = name;
        tab.textContent = this.formatKind(name);
        if (name === 'outfits') {
            tab.classList.add('.outfits-tab');
        }
        else {
            tab.draggable = true;
            tab.dataset.kind = name;
        }
        return tab;
    }
    formatKind(kind) {
        let result = '';
        let capitalizeNext = true; // start words capitalized
        for (let i = 0; i < kind.length; i++) {
            const char = kind[i];
            if (char === '-') {
                result += ' ';
                capitalizeNext = true;
                continue;
            }
            if (char === '_') {
                capitalizeNext = true;
                continue;
            }
            if (capitalizeNext) {
                result += char.toUpperCase();
                capitalizeNext = false;
            }
            else {
                result += char;
            }
        }
        return result;
    }
    normalizeKindInput(input) {
        return input.trim().toLowerCase();
    }
    createAddTabButton() {
        const button = document.createElement('button');
        button.textContent = '+';
        button.classList.add('outfit-tab', 'add-tab');
        button.addEventListener('click', () => this.onAddTabClick());
        return button;
    }
    onAddTabClick() {
        const kind = this.promptKind();
        if (kind === null)
            return; // user cancelled
        const result = this.outfitManager.getOutfitView().addSlot(kind, kind);
        switch (result) {
            case 'slot-already-exists':
                this.panel.sendSystemMessage(`Make sure no pre-existing slots are named ${kind}.`);
                return;
            case 'invalid-slot-kind':
                this.panel.sendSystemMessage('Slot kind does not conform to rules.');
                return;
            case 'added':
                this.panel.saveAndRenderContent();
                return;
        }
    }
    renderOutfitsTab(container) {
        const presets = this.outfitManager.getPresets();
        if (presets.length === 0) {
            container.innerHTML = '<div>No saved outfits.</div>';
        }
        else {
            presets.forEach(preset => {
                const presetElement = document.createElement('div');
                presetElement.className = 'outfit-preset';
                presetElement.innerHTML = `
								<div class="preset-name">${preset}</div>
								<div class="preset-actions">
									<button class="load-preset" data-preset="${preset}">Wear</button>
									<button class="delete-preset" data-preset="${preset}">×</button>
								</div>
							`;
                presetElement.querySelector('.load-preset').addEventListener('click', async () => {
                    const message = await this.outfitManager.loadPreset(preset);
                    if (message) {
                        this.panel.sendSystemMessage(message);
                    }
                    this.panel.saveAndRenderContent();
                });
                presetElement.querySelector('.delete-preset').addEventListener('click', () => {
                    if (confirm(`Delete "${preset}" outfit?`)) {
                        const message = this.outfitManager.deletePreset(preset);
                        if (message) {
                            this.panel.sendSystemMessage(message);
                        }
                        this.panel.saveAndRenderContent();
                    }
                });
                container.appendChild(presetElement);
            });
        }
        const saveButton = document.createElement('button');
        saveButton.className = 'save-outfit-btn';
        saveButton.textContent = 'Save Current Outfit';
        saveButton.addEventListener('click', async () => {
            const presetName = prompt('Name this outfit:');
            if (presetName) {
                const message = await this.outfitManager.savePreset(presetName.trim());
                if (message) {
                    this.panel.sendSystemMessage(message);
                }
                this.panel.saveAndRenderContent();
            }
        });
        container.appendChild(saveButton);
        this.renderExportButton(container);
        this.renderOutfitPreviewButton(container);
    }
    renderExportButton(container) {
        const exportButton = document.createElement('button');
        exportButton.className = 'export-outfit-btn';
        exportButton.textContent = 'Export Current Outfit';
        exportButton.addEventListener('click', this.panel.exportButtonClickListener.bind(this));
        container.appendChild(exportButton);
    }
    renderOutfitPreviewButton(container) {
        const previewButton = document.createElement('button');
        previewButton.className = 'save-outfit-btn';
        previewButton.textContent = 'Preview Outfit (LLM)';
        previewButton.addEventListener('click', () => {
            this.showOutfitPreview();
        });
        container.appendChild(previewButton);
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
            const section = document.createElement('div');
            section.classList.add('outfit-preview-section');
            const header = document.createElement('h4');
            header.textContent = `${this.formatKind(kind)}`;
            const code = document.createElement('code');
            code.textContent = `{{getglobalvar::${this.outfitManager.getVarName(kind)}_summary}}`;
            const pre = document.createElement('pre');
            pre.classList.add('outfit-preview-text', `${kind}-summary`);
            pre.textContent = this.outfitManager.getKindSummary(kind);
            section.appendChild(header);
            section.appendChild(code);
            section.appendChild(pre);
            previewBody.appendChild(section);
        }
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
}
