import { extension_settings } from "../../../../../extensions.js";
function getGlobalVars() {
    const vars = extension_settings.variables ?? (extension_settings.variables = { global: {} });
    const globalVars = vars.global ?? (vars.global = {});
    return globalVars;
}
export function getGlobalVariable(key) {
    return getGlobalVars()[key] ?? window[key] ?? 'None';
}
export function setGlobalVariable(key, value) {
    window[key] = value;
    getGlobalVars()[key] = value;
}
export function deleteGlobalVariable(key) {
    delete window[key];
    delete getGlobalVars()[key];
}
