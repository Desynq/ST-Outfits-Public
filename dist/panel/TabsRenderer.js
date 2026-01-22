import { assertNever } from "../shared.js";
import { addContextActionListener } from "../util/ElementHelper.js";
import { VisibilityTab } from "./tab/VisibilityTab.js";
const OUTFIT_SYSTEM_TAB_IDS = ['outfits', 'visibility'];
function formatKind(kind) {
    return kind;
}
export class OutfitTabsRenderer {
    constructor(panel) {
        this.panel = panel;
        this.currentTab = {
            type: 'kind',
            kind: 'Clothing'
        };
        this.draggedTab = null;
        this.visibilityTab = new VisibilityTab(this.panel, formatKind);
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
                switch (this.currentTab.id) {
                    case 'outfits':
                        this.renderOutfitsTab(contentArea);
                        break;
                    case 'visibility':
                        this.visibilityTab.render(contentArea);
                        break;
                    default:
                        return assertNever(this.currentTab.id);
                }
                break;
            case 'kind':
                const kind = this.currentTab.kind;
                const slots = this.outfitView.slots
                    .filter(s => s.kind === kind)
                    .map(s => s.id);
                if (slots.length === 0) {
                    this.renderFallback(tabsContainer);
                    return;
                }
                this.panel.getSlotsRenderer().renderSlots(kind, slots, contentArea);
                break;
            default:
                return assertNever(this.currentTab);
        }
    }
    renderFallback(tabsContainer) {
        const kinds = this.outfitView.getSlotKinds();
        if (kinds.length > 0) {
            this.currentTab = { type: 'kind', kind: kinds[0] };
        }
        else {
            this.currentTab = { type: 'system', id: 'outfits' };
        }
        this.panel.renderContent();
    }
    recreateTabs(tabsContainer) {
        const preservedTabScroll = this.getTabScroll(tabsContainer);
        tabsContainer.innerHTML = '';
        const tabEls = [];
        const kindTabEls = [];
        const kinds = this.outfitView.getSlotKinds();
        for (const kind of kinds) {
            const tab = this.createTab({ type: 'kind', kind });
            tabEls.push(tab);
            kindTabEls.push(tab);
        }
        const systemTabEls = [];
        const createSystemTabEl = (id) => {
            const el = this.createTab({ type: 'system', id });
            tabEls.push(el);
            systemTabEls.push(el);
        };
        createSystemTabEl('outfits');
        createSystemTabEl('visibility');
        for (const tabEl of tabEls) {
            tabEl.addEventListener('click', () => this.changeTab(tabEls, tabEl));
            const kindTab = this.getKindTabFromElement(tabEl);
            if (kindTab) {
                this.addDragCapabilityToTab(tabEl);
                addContextActionListener(tabEl, () => this.tryRenameTab(tabEl));
            }
        }
        const createTabListEl = (token, elements) => {
            const el = document.createElement('div');
            el.classList.add(token);
            el.append(...elements);
            return el;
        };
        const systemTabListEl = createTabListEl('system-tab-list', systemTabEls);
        const outfitTabListEl = createTabListEl('outfit-tab-list', kindTabEls);
        tabsContainer.append(outfitTabListEl, systemTabListEl, this.createAddTabButton());
        requestAnimationFrame(() => {
            outfitTabListEl.scrollLeft = preservedTabScroll;
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
                this.configureSystemTab(element, tab.id);
                break;
            case 'kind':
                element.dataset.kind = tab.kind;
                element.textContent = formatKind(tab.kind);
                element.draggable = true;
                break;
            default: assertNever(tab);
        }
        return element;
    }
    configureSystemTab(element, tabId) {
        element.dataset.tabId = tabId;
        switch (tabId) {
            case 'outfits':
                element.textContent = 'Outfits';
                element.classList.add('outfits-tab');
                break;
            case 'visibility':
                element.textContent = 'Visibility';
                element.classList.add('visibility-tab');
                break;
            default: assertNever(tabId);
        }
    }
    getTabFromElement(element) {
        const tabType = element.dataset.tabType;
        if (tabType === 'system') {
            const id = this.getSystemTabId(element);
            if (id === undefined)
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
    isOutfitSystemTabId(value) {
        return OUTFIT_SYSTEM_TAB_IDS.includes(value);
    }
    getSystemTabId(element) {
        const id = element.dataset.tabId;
        if (id === undefined)
            return undefined;
        if (!this.isOutfitSystemTabId(id))
            return undefined;
        return id;
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
            for (const preset of presets) {
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
            }
        }
        const saveButton = document.createElement('button');
        saveButton.className = 'system-tab-button save-outfit-btn';
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
    }
    renderExportButton(container) {
        const exportButton = document.createElement('button');
        exportButton.className = 'system-tab-button export-outfit-btn';
        exportButton.textContent = 'Export Current Outfit';
        exportButton.addEventListener('click', this.panel.exportButtonClickListener.bind(this));
        container.appendChild(exportButton);
    }
}
