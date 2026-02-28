import { OutfitTracker } from "../data/tracker.js";
import { formatAccessorySlotName, serializeRecord, toSlotName } from "../shared.js";
import { indentString, toKebabCase } from "../util/StringHelper.js";
import { toSummaryKey } from "../util/SummaryHelper.js";
import { deleteGlobalVariable, getGlobalVariable, setGlobalVariable } from "./GlobalVarManager.js";
import { OutfitMacroManager } from "./MacroManager.js";
export class OutfitManager {
    constructor(saveSettings, macroOwner) {
        this.saveSettings = saveSettings;
        this.summaryMacros = new OutfitMacroManager(macroOwner, 'summary', 'outfit');
    }
    get outfit() {
        return this.getOutfitView();
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
    getSnapshotsView() {
        return this.getOutfitCollection().getSnapshotView();
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
    buildPromptSlotValuesFromKind(kind) {
        return this.outfit.mapSlots(s => this.formatSlotForPrompt(s), s => s.kind === kind && s.enabled);
    }
    formatSlotForPrompt(s) {
        return (!s.equipped ? '((REMOVED))\n' : '') + s.value;
    }
    getVisibleSlotMap() {
        return this.getOutfitView().getSlotValueMap(s => s.enabled);
    }
    clearSummaries() {
        this.summaryMacros.clear();
    }
    updateSummaries() {
        const domain = this.getFullSummaryTag().domain;
        const domainChanged = this.summaryMacros.setDomain(domain);
        const kindSummaries = new Map();
        const fullSummary = this.createOutfitSummary(kindSummaries);
        const namespace = 'summary';
        const oldSummary = this.getSummary(namespace);
        if (!domainChanged && fullSummary === oldSummary)
            return;
        console.log('Updating summaries for', this.getName());
        if (!domainChanged) {
            this.summaryMacros.clear();
        }
        for (const [k, v] of kindSummaries) {
            this.updateKindSummary(k, v);
        }
        this.setSummary('*', fullSummary);
    }
    updateKindSummary(kind, value) {
        const namespace = toSummaryKey(kind);
        const oldValue = this.getSummary(namespace);
        if (value === oldValue)
            return;
        this.setSummary(namespace, value);
    }
    getFullSummaryTag() {
        return {
            domain: 'outfit',
            openingTag: `<outfit character="${this.getNameMacro()}">`,
            closingTag: '</outfit>'
        };
    }
    createOutfitSummary(out) {
        const { openingTag, closingTag } = this.getFullSummaryTag();
        let fullSummary = openingTag;
        let isFirst = true;
        for (const kind of this.getOutfitView().getSlotKinds()) {
            const value = serializeRecord(this.buildPromptSlotValuesFromKind(kind), kind === 'accessory' ? formatAccessorySlotName : toSlotName, toKebabCase(kind));
            out?.set(kind, value);
            if (value !== '') {
                fullSummary += isFirst
                    ? `\n${indentString(value)}`
                    : `\n\n${indentString(value)}`;
                isFirst = false;
            }
        }
        fullSummary += `\n${closingTag}`;
        return fullSummary;
    }
    getSummaryKey(scope) {
        return this.summaryMacros.asKey(scope);
    }
    getSummary(scope) {
        return this.summaryMacros.get(scope);
    }
    setSummary(scope, value) {
        this.summaryMacros.set(scope, value);
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
        const slot = view.resolveSlot(slotId);
        if (!slot.resolved)
            return;
        const varName = this.getVarName(slot.id);
        const prompt = this.formatSlotForPrompt(slot.raw);
        setGlobalVariable(varName, prompt);
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
