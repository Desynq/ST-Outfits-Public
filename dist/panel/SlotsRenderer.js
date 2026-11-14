import { OverflowMenuFactory } from "../ui/components/OverflowMenu.js";
import { confirmChanges } from "../ui/prompt/prompt-options.js";
import { setScroll } from "../util/element/scroll.js";
import { el } from "../util/ElementHelper.js";
import { toSlotId } from "../util/normalize/slot.js";
import { plural } from "../util/StringHelper.js";
import { OutfitPanelContext } from "./base/OutfitPanelContext.js";
import { DisplaySlot } from "./slots/DisplaySlot.js";
import { EditCoordinator } from "./slots/edit-coordinator.js";
import { TextSlotRenderer } from "./slots/renderer/text-slot.js";
import { TraitSlotRenderer } from "./slots/renderer/trait-slot.js";
import { SlotImageElementFactory } from "./slots/SlotImageController.js";
function updateBottomPadding(container, child, topOffset, below = []) {
    // 16:10 and under needs bottom padding for comfortable scrolling
    if (!window.matchMedia('(max-aspect-ratio: 1.6)').matches) {
        container.style.paddingBottom = '';
        return;
    }
    const belowHeight = below.reduce((sum, element) => sum + element.offsetHeight, 0);
    const padding = Math.max(0, container.clientHeight - child.offsetHeight - belowHeight - topOffset);
    container.style.paddingBottom = `${padding}px`;
}
export class SlotsRenderer extends OutfitPanelContext {
    constructor() {
        super(...arguments);
        this.scrollPositions = new Map();
    }
    renderSlots(kind, slots, slotContainer) {
        // Always store current scroll before replacing
        if (this.currentKind !== undefined) {
            this.scrollPositions.set(this.currentKind, slotContainer.scrollTop);
        }
        this.currentKind = kind;
        const displaySlots = this.buildDisplaySlots(slots);
        const imageFactory = new SlotImageElementFactory(this.panel, slotContainer.getBoundingClientRect().width);
        const overflowMenuFactory = new OverflowMenuFactory();
        const editCoordinator = new EditCoordinator();
        const rendererDeps = {
            panel: this.panel,
            displaySlots,
            imageFactory,
            overflowMenuFactory,
            editCoordinator
        };
        const textSlotRenderer = new TextSlotRenderer(rendererDeps);
        const traitSlotRenderer = new TraitSlotRenderer(rendererDeps);
        const fragment = document.createDocumentFragment();
        let lastSlotEl = null;
        for (let i = 0; i < displaySlots.length; i++) {
            const display = displaySlots[i];
            let slotEl;
            switch (display.slot.type) {
                case 'text': {
                    slotEl = textSlotRenderer.createSlotElement(slotContainer, display);
                    break;
                }
                case 'traits': {
                    slotEl = traitSlotRenderer.createSlotElement(slotContainer, display);
                    break;
                }
                default: {
                    throw new Error(`Unsupported slot type: ${display.slot.type}`);
                }
            }
            if (i === displaySlots.length - 1) {
                lastSlotEl = slotEl;
            }
            fragment.append(slotEl);
        }
        const footer = el('div', {
            className: 'outfit-content-footer',
            children: [
                this.createAddSlotButton(kind),
                this.createBatchReplaceButton()
            ]
        });
        fragment.append(footer);
        slotContainer.replaceChildren(fragment);
        if (lastSlotEl) {
            updateBottomPadding(slotContainer, lastSlotEl, 16, [footer]);
        }
        setScroll(slotContainer, this.scrollPositions.get(kind) ?? 0);
    }
    buildDisplaySlots(slots) {
        const resolvedSlots = this.outfitView.resolve(slots);
        const displaySlots = [];
        let displayIndex = 1;
        for (const slot of resolvedSlots) {
            if (!slot.resolved) {
                console.warn(`Slot ${slot.id} failed to resolve`);
                continue;
            }
            const slotIndex = this.outfitView.getIndexById(slot.id);
            const displaySlot = new DisplaySlot(displayIndex, slotIndex, slot);
            displaySlots.push(displaySlot);
            displayIndex++;
        }
        return displaySlots;
    }
    createAddSlotButton(kind) {
        const addSlotButton = document.createElement('button');
        addSlotButton.className = 'add-slot-button';
        addSlotButton.textContent = 'Add Slot';
        addSlotButton.addEventListener('click', () => this.promptAddSlot(kind));
        return addSlotButton;
    }
    promptAddSlot(kind) {
        const raw = prompt('Name?')?.trim();
        if (!raw) {
            return;
        }
        let type;
        let attempts = 0; // got bored
        while (true) {
            const input = prompt(`Slot type${'?'.repeat(++attempts)} (text/traits)`, 'text')?.trim().toLowerCase();
            if (input === undefined) {
                return;
            }
            if (input === 'text' || input === 'traits') {
                type = input;
                break;
            }
        }
        const id = toSlotId(raw);
        const result = this.outfitView.addSlot(id, kind, type);
        if (result === 'slot-already-exists') {
            this.panel.sendSystemMessage(`Slot with id ${id} already exists.`);
            return;
        }
        void this.outfitManager.updateSlotContext(id);
        this.panel.saveAndRender();
    }
    createBatchReplaceButton() {
        return el('button', {
            className: 'add-slot-button',
            text: 'Find and Replace',
            events: {
                click: () => this.promptFindAndReplace()
            }
        });
    }
    async promptFindAndReplace() {
        const searchValue = prompt('Find?');
        if (!searchValue) {
            return;
        }
        const replaceValue = prompt('Replace with');
        if (replaceValue === null) {
            return;
        }
        const slots = this.outfitView.slots;
        const changes = [];
        for (const slot of slots) {
            if (slot.type !== 'text') {
                continue;
            }
            const nextValue = slot.value.replaceAll(searchValue, replaceValue);
            if (nextValue !== slot.value) {
                changes.push({
                    id: slot.id,
                    old: slot.value,
                    new: nextValue
                });
            }
        }
        if (changes.length === 0) {
            toastr.info(`No matches found for '${searchValue}'.`);
            return;
        }
        const preview = changes
            .map(change => `${change.id}\n` +
            `- ${change.old}\n` +
            `+ ${change.new}`)
            .join('\n\n');
        const ok = await confirmChanges(`Replace '${searchValue}' with '${replaceValue}' in ${changes.length} slot${plural(changes.length)}?`, changes.map(change => [change.old, change.new]), {
            confirmText: 'Replace',
            cancelText: 'Cancel'
        });
        if (!ok) {
            return;
        }
        for (const change of changes) {
            this.outfitView.setValue(change.id, change.new);
            this.outfitManager.updateSlotContext(change.id, { debounceMacros: true });
        }
        toastr.info(`Replaced '${searchValue}' with '${replaceValue}' in ${changes.length} slot${plural(changes.length)}.`);
        this.panel.saveAndRender();
    }
}
