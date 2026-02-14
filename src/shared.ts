import { indentString, toKebabCase } from "./util/StringHelper.js";

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
		.map(([slot, value]) => {
			const tag = toKebabCase(slotFormatter(slot));
			return `<${tag} category="${category}">\n${indentString(value)}\n</${tag}>`;
		})
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