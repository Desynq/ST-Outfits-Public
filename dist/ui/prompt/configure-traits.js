import { OutfitTracker } from '../../data/tracker.js';
import { el } from '../../util/ElementHelper.js';
import { applyIconFallback } from '../../util/element/icon.js';
function comparableTraits(source) {
    return source.map(({ id, name, description, icon }) => ({
        id,
        name,
        description,
        icon
    }));
}
export async function promptConfigureTraits({ onSave } = {}) {
    const registry = OutfitTracker.viewTraitRegistry();
    const traits = registry.getAll().map(trait => structuredClone(trait));
    const initialState = JSON.stringify(comparableTraits(traits));
    function hasChanges() {
        return JSON.stringify(comparableTraits(traits)) !== initialState;
    }
    const expandedTraits = new Set();
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
    function updateSaveVisibility() {
        saveButton.hidden = !hasChanges();
    }
    const cancelButton = el('button', {
        type: 'button',
        className: 'menu_button',
        text: 'Cancel'
    });
    updateSaveVisibility();
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
        const expanded = expandedTraits.has(trait);
        const row = el('div', {
            className: 'trait-config-row',
            classes: [expanded ? '--expanded' : ''],
            parent: list
        });
        const main = el('div', {
            className: 'trait-config-main',
            parent: row
        });
        const trigger = el('div', {
            className: 'trait-config-trigger',
            parent: main
        });
        const icon = el('i', {
            className: getIconClass(trait.icon),
            title: 'Click to change Font Awesome icon',
            parent: trigger,
            events: {
                click(event) {
                    event.stopPropagation();
                    const current = trait.icon?.type === 'font-awesome'
                        ? trait.icon.className
                        : 'fa-solid fa-tag';
                    const value = prompt('Font Awesome icon class (leave empty to clear):', current);
                    if (value === null)
                        return;
                    const className = value.trim();
                    trait.icon = className
                        ? { type: 'font-awesome', className }
                        : null;
                    updateSaveVisibility();
                    render();
                }
            }
        });
        applyIconFallback(icon);
        const label = el('div', {
            className: 'trait-config-name',
            text: trait.name || 'New Trait',
            parent: trigger
        });
        el('div', {
            className: 'trait-config-spacer',
            parent: trigger
        });
        const removeBtn = el('button', {
            type: 'button',
            className: 'menu_button trait-config-remove',
            title: 'Remove trait',
            parent: main,
            events: {
                click() {
                    const index = traits.indexOf(trait);
                    if (index < 0)
                        return;
                    traits.splice(index, 1);
                    expandedTraits.delete(trait);
                    updateSaveVisibility();
                    render();
                }
            },
            children: [
                el('i', {
                    className: 'fa-solid fa-trash-can',
                })
            ]
        });
        const content = el('div', {
            className: 'trait-config-content',
            parent: row
        });
        content.hidden = !expanded;
        const expandButton = el('button', {
            type: 'button',
            className: 'menu_button trait-config-expand',
            title: expanded ? 'Collapse trait' : 'Expand trait',
            parent: main,
            events: {
                click() {
                    const next = !expandedTraits.has(trait);
                    if (next)
                        expandedTraits.add(trait);
                    else
                        expandedTraits.delete(trait);
                    content.hidden = !next;
                    row.classList.toggle('--expanded', next);
                    this.setAttribute('aria-expanded', String(next));
                    this.title = next ? 'Collapse trait' : 'Expand trait';
                }
            }
        });
        expandButton.setAttribute('aria-expanded', String(expanded));
        el('i', {
            className: 'fa-solid fa-chevron-down',
            parent: expandButton
        });
        trigger.addEventListener('click', () => {
            if (window.getSelection()?.toString())
                return;
            expandButton.click();
        });
        const name = el('input', {
            className: 'text_pole',
            placeholder: 'Trait name',
            value: trait.name,
            parent: content,
            events: {
                input() {
                    trait.name = this.value;
                    label.textContent = this.value || 'New Trait';
                    updateSaveVisibility();
                }
            }
        });
        el('textarea', {
            className: 'text_pole',
            rows: 2,
            placeholder: 'What does this trait do?',
            value: trait.description,
            parent: content,
            events: {
                input() {
                    trait.description = this.value;
                    updateSaveVisibility();
                }
            }
        });
    }
    function validate() {
        for (const trait of traits) {
            trait.name = trait.name.trim();
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
    modal.append(title, list, buttons);
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
