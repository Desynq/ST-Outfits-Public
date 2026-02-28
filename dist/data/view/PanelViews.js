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
export const defaultCharPanelSettings = {
    ...defaultBotPanelSettings,
    desktopXY: [20, 170],
    mobileXY: [20, 170]
};
export class PanelSettingsView {
    constructor(settings) {
        this.settings = settings;
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
    get bgColor1() {
        return this.settings.bgColor1 ?? this.getDefaultTheme().bgColor1;
    }
    get bgColor2() {
        return this.settings.bgColor2 ?? this.getDefaultTheme().bgColor2;
    }
    get borderColor() {
        return this.settings.borderColor ?? this.getDefaultTheme().borderColor;
    }
    setColor(key, color) {
        if (color === null) {
            delete this.settings[key];
            return;
        }
        this.settings[key] = color;
    }
    getDefaultXY(mode) {
        return this.getDefaultSettings()[this.accessXY(mode)];
    }
    getXY(mode) {
        const key = this.accessXY(mode);
        return (this.settings[key] ??
            (this.settings[key] = this.getDefaultSettings()[key]));
    }
    setXY(mode, x, y) {
        this.settings[this.accessXY(mode)] = [x, y];
    }
    resetXY(mode) {
        this.setXY(mode, ...this.getDefaultXY(mode));
    }
    isXYSaved() {
        return this.settings.saveXY;
    }
    setXYSaving(enabled) {
        this.settings.saveXY = enabled;
    }
}
export class UserPanelSettingsView extends PanelSettingsView {
    getDefaultSettings() {
        return defaultUserPanelSettings;
    }
    getDefaultTheme() {
        return {
            bgColor1: '#1e88e5',
            bgColor2: '#3d5afe',
            borderColor: '#64b5f6'
        };
    }
}
export class BotPanelSettingsView extends PanelSettingsView {
    getDefaultSettings() {
        return defaultBotPanelSettings;
    }
    getDefaultTheme() {
        return {
            bgColor1: '#7a57d1',
            bgColor2: '#6559e0',
            borderColor: '#8783e1'
        };
    }
}
export class CharPanelSettingsView extends PanelSettingsView {
    constructor(name, panelSettings) {
        super(panelSettings);
        this.name = name;
    }
    getFullSummaryTag() {
        return this.settings.fullSummaryTag;
    }
    setFullSummaryTag(tag, attributes) {
        tag = tag.trim();
        attributes = attributes.trim();
        if (/[<>]/.test(attributes)) {
            return 'has-xml-braces';
        }
        if (tag === '') {
            this.settings.fullSummaryTag = {
                tag: '',
                attributes,
                openingTag: attributes,
                closingTag: ''
            };
            return 'ok';
        }
        if (!/^[A-Za-z_][A-Za-z0-9_\-]*$/.test(tag)) {
            return 'invalid-tag-name';
        }
        if (attributes !== '') {
            const attrPattern = /^(\s*[A-Za-z_][A-Za-z0-9_\-]*="[^"]*"\s*)*$/;
            if (!attrPattern.test(attributes)) {
                return 'invalid-attributes';
            }
        }
        const openingTag = attributes === ''
            ? `<${tag}>`
            : `<${tag} ${attributes}>`;
        const closingTag = `</${tag}>`;
        this.settings.fullSummaryTag = {
            tag,
            attributes,
            openingTag,
            closingTag
        };
        return 'ok';
    }
    resetFullSummaryTag() {
        delete this.settings.fullSummaryTag;
    }
    getDefaultSettings() {
        return {
            saveXY: false,
            desktopXY: [20, 170],
            mobileXY: [20, 170]
        };
    }
    getDefaultTheme() {
        return {
            bgColor1: '#2a1f26',
            bgColor2: '#33242d',
            borderColor: '#4a3540'
        };
    }
}
