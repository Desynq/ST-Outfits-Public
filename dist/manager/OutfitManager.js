import { ChatOutfitStorage } from "../api/chat-metadata.js";
import * as SlotPresetsApi from "../api/internal/slot-preset.js";
import { areOutfitSnapshotsEqual } from "../data/model/OutfitSnapshots.js";
import { OutfitTracker } from "../data/tracker.js";
import { assertNever, formatAccessorySlotName, toSlotName } from "../shared.js";
import { promptOptions } from "../ui/prompt/prompt-options.js";
import { isSlotBlocked } from "../util/slot.js";
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
    getValue(slotId) {
        return this.getOutfitView().values[slotId];
    }
    loadPreset(outfitName) {
        const collection = this.getOutfitCollection();
        const newOutfit = collection.getSavedOutfit(outfitName)?.snapshot();
        if (newOutfit === undefined) {
            return 'not-found';
        }
        const view = this.getOutfitView();
        const oldOutfit = view.snapshot();
        if (areOutfitSnapshotsEqual(oldOutfit, newOutfit)) {
            return 'already-wearing';
        }
        collection.loadOutfit(newOutfit);
        this.onActiveOutfitChanged();
        return 'success';
    }
    buildSlotSummariesFromKind(kind) {
        return this.outfit.mapSlots(s => this.formatSlotSummary(s), (s, arr) => s.kind === kind && s.enabled && !isSlotBlocked(s, arr));
    }
    formatSlotSummary(s) {
        const note = ChatOutfitStorage.getAddendum(this.getName(), s.id);
        return (!s.equipped ? '((REMOVED))\n' : '')
            + s.value
            + (note ? `\n\nNote:\n${note}` : '');
    }
    getVisibleSlotMap() {
        return this.getOutfitView().getSlotValueMap((s, arr) => s.enabled && !isSlotBlocked(s, arr));
    }
    clearSummaries() {
        this.summaryMacros.clear();
    }
    updateContext() {
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
    buildSlotKindSummary(record, openingTag, closingTag) {
        return Object.entries(record)
            .map(([k, v]) => {
            const ot = openingTag(k, v);
            const tc = indentString(v);
            const ct = closingTag(k, v);
            return `${ot}\n${tc}\n${ct}`;
        })
            .join("\n\n");
    }
    createOutfitSummary(out) {
        const { openingTag, closingTag } = this.getFullSummaryTag();
        let fullSummary = openingTag;
        let isFirst = true;
        for (const kind of this.outfit.getSlotKinds()) {
            const tag = toKebabCase(kind);
            const toType = (k) => toKebabCase(kind === 'accessory'
                ? formatAccessorySlotName(k)
                : toSlotName(k));
            const openingTag = (k) => {
                const s = this.outfit.getSlotById(k);
                if (s === undefined)
                    throw new Error();
                const state = s.equipped ? 'present' : 'absent';
                return `<${tag} type="${toType(k)}" state="${state}">`;
            };
            const kindSummary = this.buildSlotKindSummary(this.buildSlotSummariesFromKind(kind), openingTag, () => `</${tag}>`);
            out?.set(kind, kindSummary);
            if (kindSummary !== '') {
                fullSummary += isFirst
                    ? `\n${indentString(kindSummary)}`
                    : `\n\n${indentString(kindSummary)}`;
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
        this.reconcileSyncedSlots();
        this.updateContext();
    }
    reconcileSyncedSlots() {
        const view = this.getOutfitView();
        let changed = false;
        for (const slot of view.slots) {
            if (!slot.synced)
                continue;
            const resolved = view.resolveSlot(slot.id);
            if (!resolved.resolved)
                continue;
            if (resolved.value === slot.value)
                continue;
            view.setValue(slot.id, resolved.value);
            changed = true;
        }
        if (changed) {
            this.saveSettings();
        }
    }
    deleteOutfitSlot(slotId) {
        const view = this.getOutfitView();
        if (!view.hasSlotId(slotId))
            return false;
        deleteGlobalVariable(this.getVarName(slotId));
        view.deleteSlot(slotId);
        this.updateContext();
        return true;
    }
    async setSlotValue(slotId, value) {
        const view = this.getOutfitView();
        const slot = view.getSlotById(slotId);
        if (slot === undefined)
            return;
        view.setValue(slot.id, value);
        await this.updateSlotContext(slotId);
    }
    async setSlotSync(slotId, synced) {
        const view = this.getOutfitView();
        const slot = view.getSlotById(slotId);
        if (!slot)
            return;
        if (!synced) {
            view.manipulate().setSync(slotId, false);
            return;
        }
        const before = view.resolveSlot(slotId);
        if (!before.resolved)
            return;
        const step = SlotPresetsApi.beginSaveSlotAsPresetFromImageTag({
            slot: before
        });
        if (step.type === 'no-image')
            return; // cannot save as preset, therefore don't allow syncing
        if (!step.oldPreset) {
            step.save();
        }
        else if (step.oldPreset.value !== before.value) {
            const choice = await promptOptions('This image already has a different synced preset. What should happen?', ['load-preset', 'use-current'], option => ({
                'load-preset': `Load preset: ${step.oldPreset.value}`,
                'use-current': `Replace preset with:\n${before.value}`
            }[option]));
            switch (choice) {
                case null:
                    return;
                case 'load-preset':
                    break;
                case 'use-current':
                    step.save();
                    break;
                default: assertNever(choice);
            }
        }
        view.manipulate().setSync(slotId, true);
        const after = view.resolveSlot(slotId);
        if (after.resolved && before.value !== after.value) {
            view.setValue(slotId, after.value);
            await this.updateSlotContext(slotId);
        }
    }
    /**
     * Updates summaries and global variables tied to slot id
     */
    async updateSlotContext(slotId) {
        const view = this.getOutfitView();
        const slot = view.resolveSlot(slotId);
        if (!slot.resolved)
            return;
        const varName = this.getVarName(slot.id);
        const prompt = this.formatSlotSummary(slot.raw);
        setGlobalVariable(varName, prompt);
        this.updateContext();
    }
    getSlots() {
        return this.getOutfitView().getSlotIds();
    }
    getValues() {
        return this.getOutfitView().values;
    }
    getOutfitView() {
        return this.getOutfitCollection().getOrCreateCurrentOutfit();
    }
    renameSlot(slotId, newId) {
        const view = this.getOutfitView();
        const oldSlot = view.getSlotById(slotId);
        if (!oldSlot)
            return 'slot-not-found';
        if (view.getSlotById(newId))
            return 'slot-already-exists';
        deleteGlobalVariable(this.getVarName(slotId));
        view.renameSlot(slotId, newId);
        void this.updateSlotContext(newId).catch(console.error);
        return 'slot-renamed';
    }
}
