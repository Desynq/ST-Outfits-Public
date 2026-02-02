import { OutfitTracker } from "../data/tracker.js";
import { deleteGlobalVariable, formatAccessorySlotName, getGlobalVariable, serializeRecord, setGlobalVariable, toSlotName } from "../shared.js";
import { StringHelper } from "../util/StringHelper.js";
export class OutfitManager {
    constructor(settingsSaver) {
        this.settingsSaver = settingsSaver;
    }
    saveSettings() {
        this.settingsSaver();
    }
    exportPreset(outfitName, character) {
        // Create preset data for all slots
        const outfit = this.getOutfitView().snapshot();
        OutfitTracker.characterOutfits(character).saveOutfit(outfitName, outfit);
        if (OutfitTracker.areSystemMessagesEnabled()) {
            return `Exported "${outfitName}" outfit to ${character}.`;
        }
        return '';
    }
    async changeOutfitItem(slotId) {
        const currentValue = this.getValue(slotId);
        let newValue = currentValue;
        const choice = prompt(`${slotId}: ${currentValue}

Enter a new value.
Leave blank to remove.
Enter "Disabled" to dereference the slot from the character's list for outfit/accessories.
Cancel to keep the current value.`, currentValue);
        if (choice === null)
            return null;
        newValue = choice.trim() === ""
            ? "None"
            : choice;
        if (newValue !== currentValue) {
            return this.setOutfitItem(slotId, newValue);
        }
        return null;
    }
    getValue(slotId) {
        return this.getOutfitView().values[slotId];
    }
    getVisibleRecordsByType(kind) {
        return this.getOutfitView().getSlotRecords(s => s.kind === kind && s.enabled);
    }
    updateSummaries() {
        let fullSummary = `<outfit character=${this.getNameMacro()}>`;
        for (const kind of this.getOutfitView().getSlotKinds()) {
            const value = serializeRecord(this.getVisibleRecordsByType(kind), kind === 'accessory' ? formatAccessorySlotName : toSlotName, kind);
            this.setSummary(kind + '_summary', value);
            if (value !== '') {
                fullSummary += `\n${StringHelper.indent(value)}`;
            }
        }
        fullSummary += `\n</outfit>`;
        this.setSummary('summary', fullSummary);
    }
    getSummary(namespace) {
        const varName = this.getVarName(namespace);
        return getGlobalVariable(varName);
    }
    setSummary(namespace, value) {
        const varName = this.getVarName(namespace);
        setGlobalVariable(varName, value);
    }
    initializeOutfit() {
        const view = this.getOutfitView();
        this.onActiveOutfitChanged();
        for (const slotId of view.getSlotIds()) {
            const varName = this.getVarName(slotId);
            const slotValue = getGlobalVariable(varName);
            if (slotValue === 'None') {
                // optimization to avoid deeper querying/defaults when global variable does not exist
                setGlobalVariable(varName, 'None');
            }
        }
    }
    onActiveOutfitChanged() {
        this.updateSummaries();
    }
    deleteOutfitSlot(slotId) {
        const view = this.getOutfitView();
        if (!view.hasSlotId(slotId))
            return false;
        deleteGlobalVariable(this.getVarName(slotId));
        view.deleteSlot(slotId);
        this.updateSummaries();
        return true;
    }
    applyOutfitValue(slotId, value) {
        const view = this.getOutfitView();
        const slot = view.getSlotById(slotId);
        if (slot === undefined)
            return;
        view.setValue(slot.id, value);
        this.updateOutfitValue(slotId);
    }
    updateOutfitValue(slotId) {
        const view = this.getOutfitView();
        const slot = view.getResolvedSlot(slotId);
        if (!slot.resolved)
            return;
        const varName = this.getVarName(slotId);
        setGlobalVariable(varName, slot.value);
        this.updateSummaries();
    }
    getSlots() {
        return this.getOutfitView().getSlotIds();
    }
    getValues() {
        return this.getOutfitView().values;
    }
    getOutfitView() {
        return this.getOutfitCollection().getOrCreateAutosaved();
    }
    renameSlot(slotId, newId) {
        const view = this.getOutfitView();
        const oldSlot = view.getSlotById(slotId);
        if (!oldSlot)
            return 'slot-not-found';
        if (view.getSlotById(newId))
            return 'slot-already-exists';
        // Capture everything BEFORE mutation
        const oldIndex = view.getIndexById(oldSlot.id);
        const value = oldSlot.value;
        this.deleteOutfitSlot(oldSlot.id);
        view.addSlot(newId, oldSlot.kind);
        view.shiftSlotByIndex(view.slots.length - 1, oldIndex);
        this.setOutfitItem(newId, value);
        return 'slot-renamed';
    }
}
