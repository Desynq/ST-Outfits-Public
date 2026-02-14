import { extension_settings } from "../../../../../extensions.js";


function getGlobalVars(): Record<string, string> {
	const vars = extension_settings.variables ??= { global: {} };
	const globalVars = vars.global ??= {};
	return globalVars;
}

export function getGlobalVariable(key: string): string {
	return getGlobalVars()[key] ?? window[key as any] ?? 'None';
}

export function setGlobalVariable(key: string, value: string): void {
	window[key as any] = value as any;
	getGlobalVars()[key] = value;
}

export function deleteGlobalVariable(key: string): void {
	delete window[key as any];
	delete getGlobalVars()[key];
}