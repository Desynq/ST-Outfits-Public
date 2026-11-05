import { OutfitTracker } from '../../data/tracker.js';
import { TraitRegistryView } from '../../data/view/TraitRegistryView.js';
import { el } from '../../util/ElementHelper.js';
export async function promptConfigureTraits({ onSave } = {}) {
    const registry = OutfitTracker.viewTraitRegistry();
    const traits = registry.getAll().map(trait => ({
        ...structuredClone(trait),
        originalId: trait.id
    }));
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
    const cancelButton = el('button', {
        type: 'button',
        className: 'menu_button',
        text: 'Cancel'
    });
    function getIconClass(visual) {
        return visual?.type === 'font-awesome'
            ? visual.className
            : 'fa-solid fa-tag';
    }
    function render() {
        list.replaceChildren();
        for (const trait of traits) {
            renderTrait(trait);
        }
    }
    function renderTrait(trait) {
        const icon = el('i', {
            className: getIconClass(trait.icon),
            title: trait.icon?.type === 'image'
                ? 'Image visual (click to replace with Font Awesome)'
                : 'Click to change Font Awesome icon',
            events: {
                click() {
                    const current = trait.icon?.type === 'font-awesome'
                        ? trait.icon.className
                        : 'fa-solid fa-tag';
                    const value = prompt('Font Awesome icon class (leave empty to clear):', current);
                    if (value === null)
                        return;
                    const className = value.trim();
                    if (className) {
                        trait.icon = { type: 'font-awesome', className };
                    }
                    else {
                        trait.icon = null;
                    }
                    render();
                }
            }
        });
        const id = el('input', {
            className: 'text_pole',
            placeholder: 'Trait ID (kebab-case)',
            value: trait.id,
            readOnly: !!trait.originalId,
            title: trait.originalId
                ? 'Existing trait IDs cannot be changed here'
                : 'Unique lowercase kebab-case identifier',
            events: {
                input() {
                    if (!trait.originalId) {
                        trait.id = this.value;
                    }
                }
            }
        });
        const description = el('textarea', {
            className: 'text_pole',
            rows: 2,
            placeholder: 'What does this trait do?',
            value: trait.description,
            events: {
                input() {
                    trait.description = this.value;
                }
            }
        });
        const remove = el('button', {
            type: 'button',
            className: 'menu_button',
            text: '×',
            title: 'Remove trait',
            events: {
                click() {
                    const index = traits.indexOf(trait);
                    if (index < 0)
                        return;
                    traits.splice(index, 1);
                    render();
                }
            }
        });
        const row = el('div', {
            className: 'trait-config-row',
            children: [
                icon,
                id,
                description,
                remove
            ]
        });
        list.append(row);
    }
    function validate() {
        const ids = new Set();
        for (const trait of traits) {
            trait.id = trait.id.trim();
            trait.description = trait.description.trim();
            if (!TraitRegistryView.isValidId(trait.id)) {
                toastr.error(`Invalid trait ID: "${trait.id}". Use lowercase kebab-case.`);
                return false;
            }
            if (ids.has(trait.id)) {
                toastr.error(`Duplicate trait ID: "${trait.id}".`);
                return false;
            }
            ids.add(trait.id);
        }
        return true;
    }
    function saveTraits() {
        const retainedIds = new Set(traits
            .map(trait => trait.originalId)
            .filter((id) => id !== undefined));
        for (const id of registry.getIds()) {
            if (retainedIds.has(id))
                continue;
            registry.remove(id);
        }
        // Update existing definitions first.
        for (const trait of traits) {
            if (!trait.originalId)
                continue;
            const result = registry.update(trait.originalId, {
                description: trait.description,
                icon: trait.icon
            });
            if (result !== 'updated') {
                throw new Error(`Failed to update "${trait.originalId}": ${result}`);
            }
        }
        // Add new definitions.
        for (const trait of traits) {
            if (trait.originalId)
                continue;
            const { originalId, ...definition } = trait;
            const result = registry.add(definition);
            if (result !== 'added') {
                throw new Error(`Failed to add "${trait.id}": ${result}`);
            }
        }
    }
    addButton.addEventListener('click', () => {
        const trait = {
            id: '',
            description: '',
            icon: {
                type: 'font-awesome',
                className: 'fa-solid fa-tag'
            }
        };
        traits.push(trait);
        render();
        const lastRow = list.lastElementChild;
        lastRow?.querySelector('input')?.focus();
    });
    buttons.append(addButton, saveButton, cancelButton);
    modal.append(title, list, buttons);
    overlay.append(modal);
    render();
    return new Promise(resolve => {
        let closed = false;
        let saving = false;
        function close() {
            if (closed)
                return;
            closed = true;
            document.removeEventListener('keydown', onKeyDown);
            overlay.remove();
            resolve();
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
            if (saving || closed || !validate())
                return;
            saving = true;
            saveButton.disabled = true;
            cancelButton.disabled = true;
            addButton.disabled = true;
            try {
                saveTraits();
                await onSave?.();
                close();
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
