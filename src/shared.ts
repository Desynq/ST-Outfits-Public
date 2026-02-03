// @ts-expect-error
import { extension_settings } from "../../../../extensions.js";
// @ts-expect-error
import { extension_prompts } from "../../../../../script.js";
// @ts-expect-error
import { inject_ids } from '../../../../constants.js';

export function mouseDragElement(element: JQuery<any>) {
	let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
	const header = element.find('.outfit-header')[0];

	if (header) header.onmousedown = dragMouseDown;

	function dragMouseDown(e: MouseEvent) {
		e.preventDefault();
		pos3 = e.clientX;
		pos4 = e.clientY;
		document.onmouseup = closeDragElement;
		document.onmousemove = elementDrag;
	}

	function elementDrag(e: MouseEvent) {
		e.preventDefault();
		pos1 = pos3 - e.clientX;
		pos2 = pos4 - e.clientY;
		pos3 = e.clientX;
		pos4 = e.clientY;
		element[0].style.top = (element[0].offsetTop - pos2) + "px";
		element[0].style.left = (element[0].offsetLeft - pos1) + "px";
	}

	function closeDragElement() {
		document.onmouseup = null;
		document.onmousemove = null;
	}
}

export function makeVarString(token: string, key: string): string {
	const label = key
		.split(/[-_]/)
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');

	return `${label}: {{getglobalvar::${token}_${key}}}`;
}

export function makeVarStrings(token: string, keys: string[]): string[] {
	return keys.map(key => makeVarString(token, key));
}


function getGlobalVars(): Record<string, string> {
	const vars = extension_settings.variables ??= { global: {} };
	const globalVars = vars.global ??= {};
	return globalVars;
}

/**
 * @returns `None` if global variable does not exist
 */
export function getGlobalVariable(name: string) {
	return getGlobalVars()[name] ?? window[name as any] ?? 'None';
}

export function setGlobalVariable(name: string, value: string) {
	window[name as any] = value as any;
	getGlobalVars()[name] = value;
}

export function deleteGlobalVariable(name: string): void {
	delete window[name as any];
	delete getGlobalVars()[name];
}





export function filterRecord(record: Record<string, string>, keys: readonly string[]): Record<string, string> {
	const out: Record<string, string> = {};
	for (const k of keys) {
		if (k in record) {
			out[k] = record[k];
		}
	}
	return out;
}

/**
 * @returns Removes all entries for which the `predicate` returns `true`.
 */
export function pruneRecord(record: Record<string, string>, predicate: (value: string, key: string) => boolean): void {
	for (const key in record) {
		if (predicate(record[key], key)) {
			delete record[key];
		}
	}
}

export function toSlotName(slotId: string): string {
	return slotId
		.replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase -> camel Case
		.replace(/-/g, ' ') // hyphens -> spaces
		.replace(/\b\w/g, str => str.toUpperCase()) // capitalize every word
		.replace(/([a-zA-Z])underwear/i, '$1 Underwear'); // legacy fix for old slot names like topunderwear -> Top Underwear
}

export function formatAccessorySlotName(name: string): string {
	return toSlotName(name).replace(/\s+Accessory$/, '');
}

export function serializeRecord(record: Record<string, string>, slotFormatter: (slot: string) => string, category: string): string {
	return Object.entries(record)
		.map(([slot, value]) => `<${category} slot="${slotFormatter(slot)}">\n${value}\n</${category}>`)
		.join("\n\n");
}


function isTouchEvent(e: MouseEvent | TouchEvent): e is TouchEvent {
	return "touches" in e;
}

export function isWideScreen() {
	return window.matchMedia('(min-width: 1024px)').matches;
}


export function assertNever(x: never): never {
	throw new Error(`Unexpected value: ${x}`);
}



export function scrollIntoViewAboveKeyboard(scroller: HTMLElement, el: HTMLElement, pad: number = 12): void {
	const vv = window.visualViewport;

	const scrollerRect = scroller.getBoundingClientRect();
	const elRect = el.getBoundingClientRect();

	const visibleTop = vv ? vv.offsetTop : 0;
	const visibleBottom = vv ? (vv.offsetTop + vv.height) : window.innerHeight;

	const clipTop = Math.max(scrollerRect.top, visibleTop);
	const clipBottom = Math.min(scrollerRect.bottom, visibleBottom);

	if (elRect.bottom > clipBottom - pad) {
		scroller.scrollTop += (elRect.bottom - (clipBottom - pad));
	}

	if (elRect.top < clipTop + pad) {
		scroller.scrollTop -= ((clipTop + pad) - elRect.top);
	}
}

export function escapeHTML(str: string): string {
	return str
		.replace(/&/g, '&amp')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}


export function getOutletPrompt(key: string): string {
	const value = extension_prompts[inject_ids.CUSTOM_WI_OUTLET(key)]?.value;
	return value || '';
}