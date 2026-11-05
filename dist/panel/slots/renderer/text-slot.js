import { SlotConditionsModal } from "../../../ui/components/SlotConditionsModal.js";
import { SlotPresetsModal } from "../../../ui/components/SlotPresetsModal.js";
import { mergeClassNames } from "../../../util/element/css.js";
import { appendElement, el } from "../../../util/ElementHelper.js";
import { SlotActionsMenuElement } from "../ActionOverflowElement.js";
import { SlotActionsElement } from "../SlotActionsElement.js";
import { createCharacterNoteFactories, SlotChatNoteFactory, SlotTextboxFactory } from "../content/text-content.js";
import { BaseSlotRenderer } from "./base-slot.js";
export class TextSlotRenderer extends BaseSlotRenderer {
    constructor(deps) {
        super(deps);
        this.textboxes = new WeakMap();
        const textboxDeps = {
            panel: this.panel,
            removeActionButtons: (ctx) => this.removeActionButtons(ctx),
            editCoordinator: deps.editCoordinator
        };
        this.valueTextboxFactory = new SlotTextboxFactory(textboxDeps);
        this.chatNoteFactory = new SlotChatNoteFactory(textboxDeps);
        this.characterNoteFactories = createCharacterNoteFactories(textboxDeps);
    }
    renderContent(ctx, _imageElement) {
        const createTextbox = (factory) => {
            const { textbox } = factory.render(ctx.contentTextEl, ctx);
            if (ctx.mode !== 'normal' && textbox.isEmpty()) {
                textbox.hide();
            }
            return textbox;
        };
        this.textboxes.set(ctx.slotElement, {
            value: createTextbox(this.valueTextboxFactory),
            chatNote: createTextbox(this.chatNoteFactory),
            characterNotes: this.characterNoteFactories.map(factory => ({
                factory,
                textbox: createTextbox(factory)
            }))
        });
    }
    getTextboxes(ctx) {
        const result = this.textboxes.get(ctx.slotElement);
        if (!result)
            throw new Error(`Textboxes not rendered for ${ctx.slot.id}`);
        return result;
    }
    bindShownImageElement(ctx, imageElement, imgWrapper) {
        super.bindShownImageElement(ctx, imageElement, imgWrapper);
        const observer = imageElement.trackResizeChanges(ctx.contentEl);
        this.panel.onRenderDispose(observer.disconnect);
        let noteEl = null;
        let valueEl = null;
        observer.onResize(event => {
            if (!valueEl)
                return;
            if (event.imageWide) {
                this.valueTextboxFactory.setCollapsedMaxHeight(valueEl, null);
                return;
            }
            const noteHeight = noteEl?.getBoundingClientRect().height ?? 0;
            const height = Math.max(0, event.imageRect.height - noteHeight);
            this.valueTextboxFactory.setCollapsedMaxHeight(valueEl, height);
        });
        const updateOnRender = (controller, set) => {
            controller.onRender(event => {
                if (!event.isFor(ctx))
                    return;
                set(event.valueEl);
                observer.update();
            });
        };
        updateOnRender(this.chatNoteFactory, el => noteEl = el);
        updateOnRender(this.valueTextboxFactory, el => valueEl = el);
    }
    decorateMinimal(ctx) {
        const textboxes = this.getTextboxes(ctx);
        const toggleBtn = this.createToggleBtn(ctx.slot);
        ctx.labelRightDiv.append(toggleBtn);
        this.appendEditBtn(ctx.labelRightDiv, ctx, textboxes.value);
        if (textboxes.value.isHidden()) {
            ctx.labelDiv.classList.add('minimized');
            textboxes.chatNote.hide();
            for (const { textbox } of textboxes.characterNotes) {
                textbox.hide();
            }
        }
        this.createMenuBtn(ctx, textboxes).appendTo(ctx.labelRightDiv);
    }
    decorate(ctx, imageElement) {
        const textboxes = this.getTextboxes(ctx);
        const actionsElement = new SlotActionsElement(this.panel);
        const toggleBtn = this.createToggleBtn(ctx.slot);
        ctx.actionsLeftEl.append(toggleBtn);
        if (ctx.slot.enabled) {
            const unequipBtn = actionsElement.createUnequipButton(ctx.slot);
            ctx.actionsLeftEl.append(unequipBtn);
        }
        const notes = [
            textboxes.chatNote,
            ...textboxes.characterNotes.map(({ textbox }) => textbox)
        ];
        for (const note of notes) {
            if (note.isEmpty()) {
                note.hide();
            }
        }
        this.appendEditBtn(ctx.actionsRightEl, ctx, textboxes.value);
        this.createMenuBtn(ctx, textboxes).appendTo(ctx.actionsRightEl);
        const syncBtn = this.createSyncButton(ctx);
        ctx.labelRightDiv.append(syncBtn);
    }
    createMenuBtn(ctx, textboxes) {
        const characterNoteActions = textboxes.characterNotes.map(({ factory, textbox }) => ({
            ...factory.getAddButtonOptions(),
            canAdd: () => this.getSlotRenderMode(ctx.slot, this.panel) === 'normal'
                && textbox.isEmpty(),
            add: () => textbox.beginInlineEdit()
        }));
        return new SlotActionsMenuElement({
            mountEl: ctx.slotElement,
            getViewBoundary: () => ctx.scroller.getBoundingClientRect(),
            onDispose: this.panel.onRenderDispose,
            deleteSlot: () => this.askDeleteSlot(ctx.slotElement, ctx.slot),
            shiftSlot: () => this.beginSlotShift(ctx),
            moveSlot: () => this.moveSlot(ctx.slot),
            showPresets: () => SlotPresetsModal.show(ctx.slot, this.outfitManager, () => this.outfitManager.updateMacros(), () => this.panel.saveAndRender()),
            canAddChatNote: () => this.getSlotRenderMode(ctx.slot, this.panel) === 'normal' && textboxes.chatNote.isEmpty(),
            addChatNote: () => textboxes.chatNote.beginInlineEdit(),
            characterNoteActions,
            showConditions: () => SlotConditionsModal.show(ctx.slot, this.outfitManager, () => this.outfitManager.updateMacros(), () => this.panel.saveAndRender()),
        }, this.deps.overflowMenuFactory)
            .onClopen(open => ctx.slotElement.classList.toggle('--menu-open', open));
    }
    appendEditBtn(container, ctx, valueTextbox) {
        const editBtn = appendElement(container, 'button', 'slot-button edit-slot', '✏️');
        editBtn.addEventListener('click', () => valueTextbox.beginInlineEdit());
        return editBtn;
    }
    createSyncButton(ctx) {
        return el('button', {
            className: mergeClassNames('sync-slot-button', ctx.slot.synced ? 'active' : 'inactive'),
            text: '⇆',
            events: {
                click: async () => {
                    await this.outfitManager.setSlotSync(ctx.slot.id, !ctx.slot.synced);
                    this.panel.saveAndRender();
                }
            }
        });
    }
}
