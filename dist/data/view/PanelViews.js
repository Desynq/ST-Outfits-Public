import { assertNever } from "../../shared.js";
export class PanelSettingsView {
    constructor(panelSettings) {
        this.panelSettings = panelSettings;
    }
    accessXY(mode) {
        switch (mode) {
            case 'desktop':
                return 'desktopXY';
            case 'mobile':
                return 'mobileXY';
            default:
                assertNever(mode);
        }
    }
    getXY(mode) {
        return this.panelSettings[this.accessXY(mode)];
    }
    setXY(mode, x, y) {
        this.panelSettings[this.accessXY(mode)] = [x, y];
    }
    isXYSaved() {
        return this.panelSettings.saveXY;
    }
    setXYSaving(enabled) {
        this.panelSettings.saveXY = enabled;
    }
}
export class UserPanelSettingsView extends PanelSettingsView {
}
export class BotPanelSettingsView extends PanelSettingsView {
}
