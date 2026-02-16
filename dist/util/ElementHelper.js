import { forceArray } from "./list-utils.js";
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
export function addLeftClickListener(element, listener) {
    element.addEventListener('click', (e) => {
        if (e.button !== 0)
            return;
        listener();
    });
}
export function addLongPressAction(el, delay, onLongPress, options) {
    let timer = null;
    let longPressTriggered = false;
    const getDelay = () => typeof delay === 'function' ? delay() : delay;
    const start = (e) => {
        if (timer !== null)
            return;
        if (options?.stopImmediatePropagation)
            e.stopImmediatePropagation();
        longPressTriggered = false;
        timer = window.setTimeout(() => {
            timer = null;
            longPressTriggered = true;
            onLongPress(e);
        }, getDelay());
    };
    const cancel = (e) => {
        if (timer !== null) {
            clearTimeout(timer);
            timer = null;
        }
        if (longPressTriggered) {
            options?.onReleaseAfterLongPress?.(e);
            longPressTriggered = false;
        }
    };
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchend', cancel);
    el.addEventListener('touchmove', cancel);
    el.addEventListener('touchcancel', cancel);
    el.addEventListener('mousedown', start);
    el.addEventListener('mouseup', cancel);
    el.addEventListener('mouseleave', cancel);
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
export function createElements(...creators) {
    const elements = [];
    for (const creator of creators) {
        const element = creator();
        elements.push(element);
    }
    return elements;
}
export function configureSharedElements(configure, ...elements) {
    for (const element of elements) {
        configure(element);
    }
    return elements;
}
export function createSharedElements(configure, ...creators) {
    const elements = createElements(...creators);
    for (const element of elements) {
        configure(element);
    }
    return elements;
}
export function createConfiguredElements(creator, ...configures) {
    const elements = [];
    for (const configure of configures) {
        const element = creator();
        configure(element);
        elements.push(element);
    }
    return elements;
}
export function createElement(tag, className, text) {
    const el = document.createElement(tag);
    if (className)
        el.className = className;
    if (text !== undefined)
        el.textContent = text;
    return el;
}
export function appendElement(container, tag, className, text) {
    const el = document.createElement(tag);
    el.className = className;
    if (text !== undefined)
        el.textContent = text;
    container.appendChild(el);
    return el;
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
    if (container === null || container === undefined) {
        throw new Error(`queryOrThrow: Container does not exist`);
    }
    const element = container.querySelector(selectors);
    if (element == null) {
        throw new Error(`queryOrThrow: No element found for selector "${selectors}" inside ${describeContainer(container)}`);
    }
    if (!(element instanceof ctor)) {
        throw new Error(`queryOrThrow: Element matching "${selectors}" is a ${element.constructor.name}, expected ${ctor.name}`);
    }
    return element;
}
export function addOrRemoveClass(element, condition, positiveTokens, negativeTokens) {
    const positives = forceArray(positiveTokens);
    const negatives = negativeTokens === undefined
        ? undefined
        : forceArray(negativeTokens);
    const add = (tokens) => {
        if (tokens)
            element.classList.add(...tokens);
    };
    const remove = (tokens) => {
        if (tokens)
            element.classList.remove(...tokens);
    };
    if (condition) {
        add(positives);
        remove(negatives);
    }
    else {
        add(negatives);
        remove(positives);
    }
    return condition;
}
export function toggleClasses(element, condition, ...tokens) {
    const method = condition ? 'add' : 'remove';
    element.classList[method](...tokens);
    return condition;
}
export function hasAnyClass(element, ...tokens) {
    for (const token of tokens) {
        if (element.classList.contains(token))
            return true;
    }
    return false;
}
export function onResizeElement(element, cb) {
    let lastWidth = 0;
    let lastHeight = 0;
    const observer = new ResizeObserver(([entry]) => {
        const { width, height } = entry.contentRect;
        if (width !== lastWidth || height !== lastHeight) {
            cb(width, height);
            lastWidth = width;
            lastHeight = height;
        }
    });
    observer.observe(element);
    return () => observer.disconnect();
}
export function setElementSize(element, width, height) {
    for (const dimension of ['width', 'height']) {
        const value = { width, height }[dimension];
        if (value === undefined)
            continue;
        element.style[dimension] = `${value}px`;
    }
}
