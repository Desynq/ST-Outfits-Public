const { extensionSettings } = SillyTavern.getContext();
function getGlobalVars() {
    const vars = extensionSettings.variables ?? (extensionSettings.variables = { global: {} });
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
