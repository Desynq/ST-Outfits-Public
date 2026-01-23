// @ts-expect-error
import { extension_settings } from "../../../../extensions.js";
export function mouseDragElement(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const header = element.find('.outfit-header')[0];
    if (header)
        header.onmousedown = dragMouseDown;
    function dragMouseDown(e) {
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }
    function elementDrag(e) {
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
export function makeVarString(token, key) {
    const label = key
        .split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    return `${label}: {{getglobalvar::${token}_${key}}}`;
}
export function makeVarStrings(token, keys) {
    return keys.map(key => makeVarString(token, key));
}
function getGlobalVars() {
    const vars = extension_settings.variables ?? (extension_settings.variables = { global: {} });
    const globalVars = vars.global ?? (vars.global = {});
    return globalVars;
}
/**
 * @returns `None` if global variable does not exist
 */
export function getGlobalVariable(name) {
    return getGlobalVars()[name] ?? window[name] ?? 'None';
}
export function setGlobalVariable(name, value) {
    window[name] = value;
    getGlobalVars()[name] = value;
}
export function deleteGlobalVariable(name) {
    delete window[name];
    delete getGlobalVars()[name];
}
export function filterRecord(record, keys) {
    const out = {};
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
export function pruneRecord(record, predicate) {
    for (const key in record) {
        if (predicate(record[key], key)) {
            delete record[key];
        }
    }
}
export function toSlotName(slotId) {
    return slotId
        .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase -> camel Case
        .replace(/-/g, ' ') // hyphens -> spaces
        .replace(/\b\w/g, str => str.toUpperCase()) // capitalize every word
        .replace(/([a-zA-Z])underwear/i, '$1 Underwear'); // legacy fix for old slot names like topunderwear -> Top Underwear
}
export function formatAccessorySlotName(name) {
    return toSlotName(name).replace(/\s+Accessory$/, '');
}
export function serializeRecord(record, slotFormatter, category) {
    return Object.entries(record)
        .map(([slot, value]) => `<${category} slot="${slotFormatter(slot)}">\n${value}\n</${category}>`)
        .join("\n\n");
}
function isTouchEvent(e) {
    return "touches" in e;
}
export function isMobile() {
    return /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent);
}
export function assertNever(x) {
    throw new Error(`Unexpected value: ${x}`);
}
export function scrollIntoViewAboveKeyboard(scroller, el, pad = 12) {
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
