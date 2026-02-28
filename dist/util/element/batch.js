export function addEvents(el, ...adds) {
    for (const [type, listener, options] of adds) {
        el.addEventListener(type, listener, options);
    }
}
