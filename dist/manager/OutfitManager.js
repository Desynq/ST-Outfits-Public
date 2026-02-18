import { OutfitTracker } from "../outfit/tracker.js";
import { deleteGlobalVariable, formatAccessorySlotName, toSlotName, getGlobalVariable, serializeRecord, setGlobalVariable } from "../shared.js";
export class OutfitManager {
    constructor() {
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
    getRecordsFromKind(kind) {
        return this.getOutfitView().getSlotRecords(s => s.kind === kind && s.enabled);
    }
    updateSummaries() {
        for (const kind of this.getOutfitView().getSlotKinds()) {
            const value = serializeRecord(this.getRecordsFromKind(kind), kind === 'accessory' ? formatAccessorySlotName : toSlotName, kind);
            this.setKindSummary(kind, value);
        }
    }
    getKindSummary(kind) {
        const varName = this.getVarName(`${kind}_summary`);
        return getGlobalVariable(varName);
    }
    setKindSummary(kind, value) {
        const varName = this.getVarName(`${kind}_summary`);
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
