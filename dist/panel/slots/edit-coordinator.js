export class EditCoordinator {
    constructor() {
        this.active = null;
    }
    beginEdit(controller) {
        this.active = controller;
    }
    canEdit(controller) {
        return this.active === null || this.active === controller;
    }
}
