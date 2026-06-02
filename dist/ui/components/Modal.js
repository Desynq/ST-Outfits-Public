import { div } from "../../util/element/divs.js";
export class SlotModal {
    constructor(slot, manager, saveAndRender, close) {
        this.slot = slot;
        this.manager = manager;
        this.saveAndRender = saveAndRender;
        this.close = close;
        this.root = this.createRoot();
        this.construct();
    }
    createRoot() {
        return div('slot-presets-modal');
    }
    isCloseOnBlur() {
        return true;
    }
    static show(slot, manager, saveAndRender) {
        const overlay = div('slot-presets-overlay');
        const ModalClass = this;
        const modal = new ModalClass(slot, manager, saveAndRender, () => {
            overlay.remove();
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
        ModalClass.show(this.slot, this.manager, this.saveAndRender);
    }
}
