import { extension_settings } from "../../../../extensions.js";

export class UserOutfitManager {
    constructor(slots) {
        this.slots = slots;
        this.currentValues = {};
        this.slots.forEach(slot => this.currentValues[slot] = 'None');
        this.loadOutfit();
    }

    getVarName(slot) {
        return `User_${slot}`;
    }

    loadOutfit() {
        this.slots.forEach(slot => {
            const varName = this.getVarName(slot);
            this.currentValues[slot] = this.getGlobalVariable(varName) || 'None';
        });
    }

    initializeOutfit() {
        this.slots.forEach(slot => {
            const varName = this.getVarName(slot);
            if (this.getGlobalVariable(varName) === 'None') {
                this.setGlobalVariable(varName, 'None');
            }
        });
        this.loadOutfit();
    }

    getGlobalVariable(name) {
        const globalVars = extension_settings.variables?.global || {};
        return globalVars[name] || window[name] || 'None';
    }

    setGlobalVariable(name, value) {
        window[name] = value;
        if (!extension_settings.variables) extension_settings.variables = { global: {} };
        extension_settings.variables.global[name] = value;
    }

    async setOutfitItem(slot, value) {
        const previousValue = this.currentValues[slot];
        const varName = this.getVarName(slot);
        this.setGlobalVariable(varName, value);
        this.currentValues[slot] = value;
    
        if (previousValue === 'None' && value !== 'None') {
            return `You put on ${value}.`;
        } else if (value === 'None') {
            return `You removed ${previousValue}.`;
        } else {
            return `You changed from ${previousValue} to ${value}.`;
        }
    }

    async changeOutfitItem(slot) {
        const currentValue = this.currentValues[slot];
        let newValue = currentValue;

        if (currentValue === 'None') {
            newValue = prompt(`What are you wearing on your ${slot}?`, "");
            if (!newValue) return null;
        } else {
            const choice = prompt(
                `Your ${slot}: ${currentValue}\n\nEnter 'remove' to remove, or type new item:`,
                ""
            );

            if (!choice) return null;
            newValue = choice.toLowerCase() === 'remove' ? 'None' : choice;
        }

        if (newValue !== currentValue) {
            return this.setOutfitItem(slot, newValue);
        }
        return null;
    }

    getOutfitData(slots) {
        return slots.map(slot => ({
            name: slot,
            value: this.currentValues[slot],
            varName: this.getVarName(slot)
        }));
    }
    
    savePreset(presetName) {
        // Initialize presets if needed
        if (!extension_settings.outfit_tracker.presets) {
            extension_settings.outfit_tracker.presets = { bot: {}, user: {} };
        }
        
        // Create preset data for all slots
        const presetData = {};
        this.slots.forEach(slot => {
            presetData[slot] = this.currentValues[slot];
        });
        
        // Save or update preset
        extension_settings.outfit_tracker.presets.user[presetName] = presetData;
        
        if (extension_settings.outfit_tracker.enableSysMessages) {
            return `Saved "${presetName}" outfit for user character.`;
        }
        return '';
    }
    
    async loadPreset(presetName) {
        if (!extension_settings.outfit_tracker.presets?.user?.[presetName]) {
            return `[Outfit System] Preset "${presetName}" not found.`;
        }
        
        const preset = extension_settings.outfit_tracker.presets.user[presetName];
        let changed = false;
        
        for (const [slot, value] of Object.entries(preset)) {
            if (this.slots.includes(slot) && this.currentValues[slot] !== value) {
                const varName = this.getVarName(slot);
                this.setGlobalVariable(varName, value);
                this.currentValues[slot] = value;
                changed = true;
            }
        }
        
        if (changed) {
            return `You changed into the "${presetName}" outfit.`;
        }
        return `You are already wearing the "${presetName}" outfit.`;
    }
    
    deletePreset(presetName) {
        if (!extension_settings.outfit_tracker.presets?.user?.[presetName]) {
            return `[Outfit System] Preset "${presetName}" not found.`;
        }
        
        delete extension_settings.outfit_tracker.presets.user[presetName];
        
        if (extension_settings.outfit_tracker.enableSysMessages) {
            return `Deleted your "${presetName}" outfit.`;
        }
        return '';
    }
    
    getPresets() {
        if (!extension_settings.outfit_tracker.presets?.user) {
            return [];
        }
        return Object.keys(extension_settings.outfit_tracker.presets.user);
    }
}
