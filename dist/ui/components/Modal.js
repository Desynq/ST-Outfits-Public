import { div } from "../../util/element/divs.js";
export class SlotModal {
    constructor(context) {
        this.slot = context.slot;
        this.manager = context.manager;
        this.updateContext = context.updateContext;
        this.saveAndRender = context.saveAndRender;
        this.close = context.close;
        this.root = this.createRoot();
        this.construct();
    }
    createRoot() {
        return div('slot-presets-modal');
    }
    isCloseOnBlur() {
        return true;
    }
    static show(slot, manager, updateContext, saveAndRender) {
        const overlay = div('slot-presets-overlay');
        const modal = new this({
            slot,
            manager,
            updateContext,
            saveAndRender,
            close: () => overlay.remove()
        });
        overlay.append(modal.root);
        document.body.append(overlay);
        if (modal.isCloseOnBlur()) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.remove();
                }
            });
        }
    }
    reshow() {
        this.close();
        const ModalClass = this.constructor;
        ModalClass.show(this.slot, this.manager, this.updateContext, this.saveAndRender);
    }
}
