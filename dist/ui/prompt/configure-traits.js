import { OutfitTracker } from '../../data/tracker.js';
import { el } from '../../util/ElementHelper.js';
import { renderTrait } from './render/trait.js';
function comparableTraits(source) {
    return source.map(({ id, name, group, description, icon }) => ({
        id,
        name,
        group,
        description,
        icon
    }));
}
const DEFAULT_GROUP = '';
export async function promptConfigureTraits({ onSave } = {}) {
    const registry = OutfitTracker.viewTraitRegistry();
    const traits = registry.getAll().map(trait => structuredClone(trait));
    const initialState = JSON.stringify(comparableTraits(traits));
    function hasChanges() {
        return JSON.stringify(comparableTraits(traits)) !== initialState;
    }
    const expandedTraits = new Set();
    let activeGroup = '';
    function getGroups() {
        const groups = [...new Set(traits.map(trait => trait.group))];
        if (!groups.length) {
            groups.push(DEFAULT_GROUP);
        }
        return groups;
    }
    const overlay = el('div', {
        className: 'sto-overlay show'
    });
    const modal = el('div', {
        className: 'outfit-option-modal trait-config',
        role: 'dialog',
        ariaModal: 'true'
    });
    const title = el('h3', {
        text: 'Configure Traits'
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
    const addButton = el('button', {
        type: 'button',
        className: 'menu_button',
        text: '+ Add Trait'
    });
    const saveButton = el('button', {
        type: 'button',
        className: 'menu_button',
        text: 'Save'
    });
    function updateSaveVisibility() {
        saveButton.hidden = !hasChanges();
    }
    const cancelButton = el('button', {
        type: 'button',
        className: 'menu_button',
        text: 'Cancel'
    });
    updateSaveVisibility();
    function render() {
        renderGroups();
        list.replaceChildren();
        for (const trait of traits) {
            if (trait.group !== activeGroup) {
                continue;
            }
            const { traitEl } = renderTrait({
                expandedTraits,
                updateSaveVisibility,
                render,
                getGroups,
                traits
            }, trait);
            list.appendChild(traitEl);
        }
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
                classes: [group === activeGroup ? '--active' : ''],
                text: group || 'Default',
                parent: groupBar,
            });
            button.addEventListener('click', () => {
                if (activeGroup === group) {
                    return;
                }
                activeGroup = group;
                render();
            });
            button.setAttribute('aria-pressed', String(group === activeGroup));
        }
    }
    function validate() {
        for (const trait of traits) {
            trait.name = trait.name.trim();
            trait.group = trait.group.trim();
            trait.description = trait.description.trim();
            if (!trait.name) {
                toastr.error('Trait names cannot be empty.');
                return false;
            }
        }
        return true;
    }
    function saveTraits() {
        const retainedIds = new Set(traits
            .map(trait => trait.id)
            .filter((id) => id !== undefined));
        // Remove deleted traits.
        for (const id of registry.getIds()) {
            if (!retainedIds.has(id)) {
                registry.remove(id);
            }
        }
        // Update existing traits and add new ones.
        for (const trait of traits) {
            const { id, ...definition } = trait;
            if (id) {
                const result = registry.update(id, definition);
                if (result !== 'updated') {
                    throw new Error(`Failed to update "${id}": ${result}`);
                }
            }
            else {
                const created = registry.add(definition);
                trait.id = created.id; // prevent duplicate definitions
            }
        }
    }
    addButton.addEventListener('click', () => {
        const trait = {
            name: '',
            group: activeGroup,
            description: '',
            icon: {
                type: 'font-awesome',
                className: 'fa-solid fa-tag'
            }
        };
        traits.push(trait);
        expandedTraits.add(trait);
        updateSaveVisibility();
        render();
        const lastRow = list.lastElementChild;
        lastRow?.querySelector('.trait-config-content > input')?.focus();
    });
    buttons.append(addButton, saveButton, cancelButton);
    modal.append(title, groupBar, list, buttons);
    overlay.append(modal);
    render();
    return new Promise(resolve => {
        let closed = false;
        let saving = false;
        function close(saved = false) {
            if (closed)
                return;
            closed = true;
            document.removeEventListener('keydown', onKeyDown);
            overlay.remove();
            resolve(saved);
        }
        function onKeyDown(event) {
            if (event.key === 'Escape' && !saving) {
                event.preventDefault();
                close();
            }
        }
        document.addEventListener('keydown', onKeyDown);
        cancelButton.addEventListener('click', () => {
            if (!saving)
                close();
        });
        overlay.addEventListener('click', event => {
            if (event.target === overlay && !saving) {
                close();
            }
        });
        saveButton.addEventListener('click', async () => {
            if (saving || closed || !hasChanges() || !validate())
                return;
            saving = true;
            saveButton.disabled = true;
            cancelButton.disabled = true;
            addButton.disabled = true;
            try {
                saveTraits();
                await onSave?.();
                close(true);
            }
            catch (error) {
                console.error('Failed to save trait definitions:', error);
                toastr.error('Failed to save trait definitions.');
            }
            finally {
                saving = false;
                saveButton.disabled = false;
                cancelButton.disabled = false;
                addButton.disabled = false;
            }
        });
        document.body.append(overlay);
    });
}
