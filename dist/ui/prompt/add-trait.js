import { OutfitTracker } from '../../data/tracker.js';
import { el } from '../../util/ElementHelper.js';
import { applyIconFallback } from '../../util/element/icon.js';
const DEFAULT_GROUP = '';
export async function promptAddTrait({ excludedIds = new Set(), onConfigure } = {}) {
    const registry = OutfitTracker.viewTraitRegistry();
    let activeGroup = DEFAULT_GROUP;
    let available = [];
    const overlay = el('div', {
        className: 'sto-overlay show'
    });
    const modal = el('div', {
        className: 'outfit-option-modal trait-config trait-add',
        role: 'dialog',
        ariaModal: 'true'
    });
    const title = el('h3', {
        text: 'Add Trait'
    });
    const groupBar = el('div', {
        className: 'trait-config-groups'
    });
    const list = el('div', {
        className: 'trait-config-list'
    });
    const buttons = el('div', {
        className: 'trait-config-buttons'
    });
    const configureButton = el('button', {
        type: 'button',
        className: 'menu_button',
        text: '⚙ Configure Traits'
    });
    const cancelButton = el('button', {
        type: 'button',
        className: 'menu_button',
        text: 'Cancel'
    });
    buttons.append(configureButton, cancelButton);
    modal.append(title, groupBar, list, buttons);
    overlay.append(modal);
    function getGroups() {
        const groups = [
            ...new Set(available.map(trait => trait.group))
        ];
        return groups.length ? groups : [DEFAULT_GROUP];
    }
    function getIconClass(visual) {
        return visual?.type === 'font-awesome'
            ? visual.className
            : 'fa-solid fa-tag';
    }
    function refresh() {
        available = registry.getAll()
            .filter(trait => !excludedIds.has(trait.id));
        render();
    }
    function renderGroups() {
        groupBar.replaceChildren();
        const groups = getGroups();
        if (!groups.includes(activeGroup)) {
            activeGroup = groups[0];
        }
        for (const group of groups) {
            const button = el('button', {
                type: 'button',
                className: 'trait-config-group',
                classes: [
                    group === activeGroup ? '--active' : ''
                ],
                text: group || 'Default',
                parent: groupBar,
                events: {
                    click() {
                        if (activeGroup === group)
                            return;
                        activeGroup = group;
                        render();
                    }
                }
            });
            button.setAttribute('aria-pressed', String(group === activeGroup));
        }
    }
    function render() {
        renderGroups();
        list.replaceChildren();
        const traits = available.filter(trait => trait.group === activeGroup);
        if (!traits.length) {
            el('div', {
                className: 'trait-add-empty',
                text: available.length
                    ? 'No available traits in this group.'
                    : 'No available traits. Configure traits to add more.',
                parent: list
            });
            return;
        }
        for (const trait of traits) {
            const row = el('button', {
                type: 'button',
                className: 'trait-add-row',
                title: trait.description,
                parent: list,
                events: {
                    click() {
                        close(trait.id);
                    }
                }
            });
            const icon = el('i', {
                className: getIconClass(trait.icon),
                parent: row
            });
            applyIconFallback(icon);
            el('span', {
                className: 'trait-add-name',
                text: trait.name,
                parent: row
            });
            el('i', {
                className: 'fa-solid fa-plus trait-add-plus',
                parent: row
            });
        }
    }
    let resolveResult;
    let closed = false;
    let configuring = false;
    function close(result = null) {
        if (closed || configuring)
            return;
        closed = true;
        document.removeEventListener('keydown', onKeyDown);
        overlay.remove();
        resolveResult(result);
    }
    function onKeyDown(event) {
        if (event.key !== 'Escape' || configuring)
            return;
        event.preventDefault();
        close();
    }
    cancelButton.addEventListener('click', () => close());
    overlay.addEventListener('click', event => {
        if (event.target === overlay) {
            close();
        }
    });
    configureButton.addEventListener('click', async () => {
        if (configuring || !onConfigure)
            return;
        configuring = true;
        configureButton.disabled = true;
        try {
            const changed = await onConfigure();
            if (!changed) {
                configuring = false;
                close();
                return;
            }
            refresh();
        }
        catch (error) {
            console.error('Failed to configure traits:', error);
            toastr.error('Failed to configure traits.');
        }
        finally {
            configuring = false;
            configureButton.disabled = false;
        }
    });
    configureButton.hidden = !onConfigure;
    refresh();
    return new Promise(resolve => {
        resolveResult = resolve;
        document.addEventListener('keydown', onKeyDown);
        document.body.append(overlay);
    });
}
