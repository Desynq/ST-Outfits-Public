import { assertNever } from "../../shared.js";
export const defaultUserPanelSettings = {
    desktopXY: [20, 50],
    mobileXY: [20, 50],
    saveXY: false
};
export const defaultBotPanelSettings = {
    ...defaultUserPanelSettings,
    desktopXY: [20, 110],
    mobileXY: [20, 110]
};
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
    getDefaultXY(mode) {
        return this.getDefaultSettings()[this.accessXY(mode)];
    }
    getXY(mode) {
        return this.panelSettings[this.accessXY(mode)];
    }
    setXY(mode, x, y) {
        this.panelSettings[this.accessXY(mode)] = [x, y];
    }
    resetXY(mode) {
        this.setXY(mode, ...this.getDefaultXY(mode));
    }
    isXYSaved() {
        return this.panelSettings.saveXY;
    }
    setXYSaving(enabled) {
        this.panelSettings.saveXY = enabled;
    }
}
export class UserPanelSettingsView extends PanelSettingsView {
    getDefaultSettings() {
        return defaultUserPanelSettings;
    }
}
export class BotPanelSettingsView extends PanelSettingsView {
    getDefaultSettings() {
        return defaultBotPanelSettings;
    }
}
