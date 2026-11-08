export function addRow(args) {
    const { ctx, editable, registry, list, assignment } = args;
    const definition = registry.get(assignment.traitId);
    // Dangling references are valid, but not displayed.
    if (!definition)
        return;
    const row = el('div', {
        className: 'slot-trait-row',
        parent: list
    });
    const main = el('div', {
        className: 'slot-trait-main',
        parent: row
    });
    const triggerEl = el('div', {
        className: 'slot-trait-trigger',
        parent: main
    });
    const iconEl = el('i', {
        className: definition.icon?.type === 'font-awesome'
            ? definition.icon.className
            : 'fa-solid fa-tag',
        parent: triggerEl
    });
    let spin = null;
    iconEl.addEventListener('click', event => {
        event.stopPropagation();
        if (spin?.playState === 'running') {
            spin.reverse();
            return;
        }
        spin = iconEl.animate([
            { transform: 'rotate(0deg)' },
            { transform: 'rotate(360deg)' }
        ], {
            duration: 500,
            easing: 'ease-in-out'
        });
    });
    const traitNameDiv = el('div', {
        className: 'slot-trait-name',
        classes: [
            assignment.addendum?.trim() ? '--has-addendum' : ''
        ],
        text: definition.name,
        title: [
            definition.description,
            assignment.addendum?.trim()
        ].filter(Boolean).join('\n\n'),
        parent: triggerEl
    });
    const spacerDiv = el('div', {
        className: 'slot-trait-spacer',
        parent: triggerEl
    });
    const content = el('div', {
        className: 'slot-trait-content',
        parent: row
    });
    const traitKey = `${ctx.slot.id}:${assignment.traitId}`;
    const initiallyExpanded = this.expandedTraits.has(traitKey);
    content.hidden = !initiallyExpanded;
    row.classList.toggle('--expanded', initiallyExpanded);
    const expandButton = el('button', {
        className: 'slot-button slot-trait-expand',
        title: 'Expand trait',
        parent: main,
        events: {
            click: () => {
                const expanded = !this.expandedTraits.has(traitKey);
                if (expanded) {
                    this.expandedTraits.add(traitKey);
                }
                else {
                    this.expandedTraits.delete(traitKey);
                }
                content.hidden = !expanded;
                row.classList.toggle('--expanded', expanded);
                expandButton.title = expanded
                    ? 'Collapse trait'
                    : 'Expand trait';
                expandButton.setAttribute('aria-expanded', String(expanded));
            }
        }
    });
    triggerEl.addEventListener('click', () => {
        if (window.getSelection()?.toString()) {
            return;
        }
        expandButton.click();
    });
    expandButton.setAttribute('aria-expanded', String(initiallyExpanded));
    expandButton.title = initiallyExpanded
        ? 'Collapse trait'
        : 'Expand trait';
    el('i', {
        className: 'fa-solid fa-chevron-down',
        parent: expandButton
    });
    const traitDescDiv = el('div', {
        className: 'slot-trait-description',
        text: definition.description,
        parent: content
    });
    if (editable) {
        addDoubleTapListener(traitDescDiv, async () => {
            await promptConfigureTraits({
                onSave: () => this.panel.applyTraitChanges()
            });
        });
    }
    const editActions = el('div', {
        className: 'slot-trait-edit-actions'
    });
    const actionsLeftEl = el('div', {
        className: 'slot-trait-edit-actions-left',
        parent: editActions
    });
    const actionsRightEl = el('div', {
        className: 'slot-trait-edit-actions-right',
        parent: editActions
    });
    editActions.hidden = true;
    const addendumArgs = {
        ...args,
        parent: content,
        editActions,
        actionsLeftEl,
        actionsRightEl
    };
    const { textbox } = this.addAddendumEl(addendumArgs);
    if (!editable)
        return;
    const controls = el('div', {
        className: 'slot-trait-controls',
        parent: main
    });
    main.insertBefore(controls, expandButton);
    el('button', {
        className: 'slot-button',
        text: '✎',
        title: 'Edit addendum',
        parent: controls,
        events: {
            click: () => textbox.beginInlineEdit()
        }
    });
    el('button', {
        className: 'slot-button',
        text: '×',
        title: 'Remove trait',
        parent: controls,
        events: {
            click: () => this.removeTrait(ctx, assignment.traitId)
        }
    });
    content.append(editActions);
}
