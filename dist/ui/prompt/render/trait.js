import { TraitRegistryView } from "../../../data/view/TraitRegistryView.js";
import { applyIconFallback } from "../../../util/element/icon.js";
import { el } from "../../../util/ElementHelper.js";
import { promptConfigureTraitIcon } from "../configure-trait-icon.js";
export function renderTrait({ expandedTraits, updateSaveVisibility, render, getGroups, traits, }, trait) {
    const expanded = expandedTraits.has(trait);
    const row = el('div', {
        className: 'trait-config-row',
        classes: [
            expanded ? '--expanded' : '',
            trait.contextInline === true ? '--context-inline' : ''
        ]
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
        className: TraitRegistryView.getIconClass(trait.icon),
        title: 'Click to configure Font Awesome icon',
        parent: trigger
    });
    applyIconFallback(icon);
    if (trait.icon?.type === 'font-awesome') {
        icon.style.color = trait.icon.color ?? '';
    }
    const label = el('div', {
        className: 'trait-config-name',
        text: trait.name || 'New Trait',
        parent: trigger
    });
    el('div', {
        className: 'trait-config-spacer',
        parent: trigger
    });
    const changeGroupBtn = el('button', {
        type: 'button',
        className: 'menu_button trait-config-row-button trait-config-change-group',
        title: 'Change Group',
        parent: main,
        children: [
            el('i', {
                className: 'fa-solid fa-folder'
            })
        ]
    });
    const removeBtn = el('button', {
        type: 'button',
        className: 'menu_button trait-config-row-button trait-config-remove',
        title: 'Remove trait',
        parent: main,
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
        className: 'menu_button trait-config-row-button trait-config-expand',
        title: expanded ? 'Collapse trait' : 'Expand trait',
        parent: main,
        children: [
            el('i', {
                className: 'fa-solid fa-chevron-down'
            })
        ]
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
    const description = el('textarea', {
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
    const contextualizeInlineLabel = el('label', {
        className: 'checkbox_label',
        parent: content
    });
    el('input', {
        type: 'checkbox',
        checked: trait.contextInline === true,
        parent: contextualizeInlineLabel,
        events: {
            change() {
                trait.contextInline = this.checked;
                row.classList.toggle('--context-inline', this.checked);
                updateSaveVisibility();
            }
        }
    });
    el('span', {
        text: 'Contextualize Inline',
        title: 'Include this trait with its assigned slot instead of in the global trait context',
        parent: contextualizeInlineLabel
    });
    /* --------------------------------- Events --------------------------------- */
    trigger.addEventListener('click', () => {
        if (window.getSelection()?.toString()) {
            return;
        }
        expandButton.click();
    });
    icon.addEventListener('click', async (event) => {
        event.stopPropagation();
        const result = await promptConfigureTraitIcon(trait.icon);
        if (result === undefined) {
            return;
        }
        trait.icon = result;
        updateSaveVisibility();
        render();
    });
    changeGroupBtn.addEventListener('click', () => {
        const groups = getGroups();
        const value = prompt(`Move "${trait.name}" to group:\n\n` +
            `Existing groups:\n${groups.join('\n') || '(none)'}\n\n` +
            `Enter a group name (leave empty for Default):`, trait.group);
        if (value === null) {
            return;
        }
        const group = value.trim();
        if (group === trait.group) {
            return;
        }
        // Reuse existing capitalization when names match
        trait.group = groups.find(existing => existing.toLowerCase() === group.toLowerCase()) ?? group;
        updateSaveVisibility();
        render();
    });
    removeBtn.addEventListener('click', () => {
        const index = traits.indexOf(trait);
        if (index < 0) {
            return;
        }
        traits.splice(index, 1);
        expandedTraits.delete(trait);
        updateSaveVisibility();
        render();
    });
    expandButton.addEventListener('click', () => {
        const next = !expandedTraits.has(trait);
        if (next) {
            expandedTraits.add(trait);
        }
        else {
            expandedTraits.delete(trait);
        }
        content.hidden = !next;
        row.classList.toggle('--expanded', next);
        expandButton.setAttribute('aria-expanded', String(next));
        expandButton.title = next ? 'Collapse trait' : 'Expand trait';
    });
    expandButton.setAttribute('aria-expanded', String(expanded));
    return {
        traitEl: row
    };
}
