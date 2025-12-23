import { assertNever } from "../shared.js";
import { ElementHelper } from "../util/ElementHelper.js";
export class OutfitTabsRenderer {
    constructor(panel) {
        this.panel = panel;
        this.currentTab = {
            type: 'kind',
            kind: 'clothing'
        };
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
        switch (this.currentTab.type) {
            case 'system':
                if (this.currentTab.id === 'outfits')
                    this.renderOutfitsTab(contentArea);
                break;
            case 'kind':
                const kind = this.currentTab.kind;
                const slots = this.outfitManager.getOutfitView().slots
                    .filter(s => s.kind === kind)
                    .map(s => s.id);
                if (slots.length === 0) { // fallback
                    tabsContainer.querySelector('button[data-tab-type="system"]')?.click();
                    return;
                }
                this.panel.getSlotsRenderer().renderSlots(kind, slots, contentArea);
                break;
            default: assertNever(this.currentTab);
        }
    }
    recreateTabs(tabsContainer) {
        const preservedTabScroll = this.getTabScroll(tabsContainer);
        tabsContainer.innerHTML = '';
        const tabEls = [];
        const kinds = this.outfitView.getSlotKinds();
        for (const kind of kinds) {
            const tab = this.createTab({ type: 'kind', kind });
            tabEls.push(tab);
        }
        const systemOutfitsTabEl = this.createTab({ type: 'system', id: 'outfits' });
        tabEls.push(systemOutfitsTabEl);
        const tabListEl = document.createElement('div');
        tabListEl.classList.add('outfit-tab-list');
        for (const tabEl of tabEls) {
            tabEl.addEventListener('click', () => this.changeTab(tabEls, tabEl));
            const kindTab = this.getKindTabFromElement(tabEl);
            if (kindTab) {
                this.addDragCapabilityToTab(tabEl);
                ElementHelper.addContextActionListener(tabEl, () => this.tryRenameTab(tabEl));
                tabListEl.appendChild(tabEl);
            }
        }
        tabsContainer.appendChild(tabListEl);
        tabsContainer.appendChild(systemOutfitsTabEl);
        tabsContainer.appendChild(this.createAddTabButton());
        requestAnimationFrame(() => {
            tabListEl.scrollLeft = preservedTabScroll;
        });
    }
    getTabScroll(tabsContainer) {
        const tabList = tabsContainer.querySelector('.outfit-tab-list');
        return tabList ? tabList.scrollLeft : 0;
    }
    changeTab(allTabs, clickedTab) {
        const tab = this.getTabFromElement(clickedTab);
        if (!tab)
            throw new Error(`Element could not be coerced into a tab: ${clickedTab.outerHTML}`);
        this.currentTab = tab;
        this.panel.renderContent();
        for (const t of allTabs) {
            t.classList.remove('active');
        }
        clickedTab.classList.add('active');
    }
    tryRenameTab(tabEl) {
        if (!tabEl.classList.contains('active'))
            return; // user can only rename current tab
        const result = this.renameTab(tabEl);
        if (result.status === 'renamed') {
            this.currentTab = {
                type: 'kind',
                kind: result.newName
            };
            this.panel.saveAndRenderContent();
        }
    }
    renameTab(tabElement) {
        const kind = this.assertKindTab(tabElement).kind;
        const newKind = this.promptKind();
        if (newKind === null)
            return { status: 'cancelled', newName: null }; // user cancelled
        const result = this.outfitView.renameKind(kind, newKind);
        switch (result) {
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
        const message = `New slot kind name:`;
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
    createTab(tab) {
        const element = document.createElement('button');
        element.classList.add('outfit-tab');
        if (this.tabsEqual(this.currentTab, tab)) {
            element.classList.add('active');
        }
        element.dataset.tabType = tab.type;
        switch (tab.type) {
            case 'system':
                element.dataset.tabId = tab.id;
                element.textContent = 'Outfits';
                element.classList.add('outfits-tab');
                break;
            case 'kind':
                element.dataset.kind = tab.kind;
                element.textContent = this.formatKind(tab.kind);
                element.draggable = true;
                break;
            default: assertNever(tab);
        }
        return element;
    }
    getTabFromElement(element) {
        const tabType = element.dataset.tabType;
        if (tabType === 'system') {
            const id = element.dataset.tabId;
            if (!id)
                return undefined;
            return { type: 'system', id: id };
        }
        if (tabType === 'kind') {
            const kind = element.dataset.kind;
            if (!kind)
                return undefined;
            return { type: 'kind', kind };
        }
        return undefined;
    }
    assertTab(element) {
        const tab = this.getTabFromElement(element);
        if (!tab) {
            throw new Error(`Element could not be coerced into a tab: ${element.outerHTML}`);
        }
        return tab;
    }
    getKindTabFromElement(element) {
        const tab = this.getTabFromElement(element);
        if (!tab)
            return undefined;
        return tab.type === 'kind' ? tab : undefined;
    }
    assertKindTab(element) {
        const tab = this.getKindTabFromElement(element);
        if (!tab) {
            throw new Error(`System tabs cannot be renamed: ${element.outerHTML}`);
        }
        return tab;
    }
    tabsEqual(a, b) {
        if (a.type !== b.type)
            return false;
        switch (a.type) {
            case 'system':
                return b.type === 'system' && a.id === b.id;
            case 'kind':
                return b.type === 'kind' && a.kind === b.kind;
            default: assertNever(a);
        }
    }
    formatKind(kind) {
        return kind;
    }
    normalizeKindInput(input) {
        return input.trim();
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
