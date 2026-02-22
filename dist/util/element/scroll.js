export function captureScroll(element, horizontal = false) {
    const scrollDirection = horizontal ? 'scrollLeft' : 'scrollTop';
    const prevScroll = element[scrollDirection];
    return (el) => requestAnimationFrame(() => {
        el[scrollDirection] = prevScroll;
    });
}
export function setScroll(element, value, horizontal = false) {
    if (typeof value !== 'number')
        return;
    const scrollDirection = horizontal ? 'scrollLeft' : 'scrollTop';
    requestAnimationFrame(() => {
        element[scrollDirection] = value;
    });
}
