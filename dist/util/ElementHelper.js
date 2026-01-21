export function addContextActionListener(element, listener, longPressMs = 550) {
    element.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        listener();
    });
    // mobile support
    let timer = null;
    element.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse')
            return;
        timer = window.setTimeout(() => {
            navigator.vibrate?.(15);
            listener();
        }, longPressMs);
    });
    const cancel = () => {
        if (timer !== null) {
            clearTimeout(timer);
            timer = null;
        }
    };
    element.addEventListener('pointerup', cancel);
    element.addEventListener('pointerleave', cancel);
    element.addEventListener('pointercancel', cancel);
}
export function append(container, factory) {
    const element = factory();
    container.appendChild(element);
    return element;
}
export function pushConfigured(list, element, configure) {
    configure(element);
    list.push(element);
    return element;
}
export function createElements(creator, ...configures) {
    const elements = [];
    for (const configure of configures) {
        const element = creator();
        configure(element);
        elements.push(element);
    }
    return elements;
}
function describeContainer(container) {
    if (container instanceof Element) {
        return `<${container.tagName.toLowerCase()}>`;
    }
    if (container instanceof Document) {
        return "Document";
    }
    if (container instanceof DocumentFragment) {
        return "DocumentFragment";
    }
    return "Unknown ParentNode";
}
export function queryOrThrow(container, ctor, selectors) {
    const element = container.querySelector(selectors);
    if (element == null) {
        throw new Error(`queryOrThrow: No element found for selector "${selectors}" inside ${describeContainer(container)}`);
    }
    if (!(element instanceof ctor)) {
        throw new Error(`queryOrThrow: Element matching "${selectors}" is a ${element.constructor.name}, expected ${ctor.name}`);
    }
    return element;
}
