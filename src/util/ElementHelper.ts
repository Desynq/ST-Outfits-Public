import { addEvents } from "./element/batch.js";
import { conditionalList, forceArray } from "./list-utils.js";



export function addContextActionListener(element: HTMLElement, listener: () => void, longPressMs: number = 550): void {
	element.addEventListener('contextmenu', (e) => {
		e.preventDefault();
		e.stopPropagation();
		listener();
	});

	// mobile support
	let timer: number | null = null;

	element.addEventListener('pointerdown', (e) => {
		if (e.pointerType === 'mouse') return;

		timer = window.setTimeout(() => {
			navigator.vibrate?.(15);
			listener();
		}, longPressMs);
	});

	const cancel = (): void => {
		if (timer !== null) {
			clearTimeout(timer);
			timer = null;
		}
	};

	element.addEventListener('pointerup', cancel);
	element.addEventListener('pointerleave', cancel);
	element.addEventListener('pointercancel', cancel);
}


export function addLeftClickListener(element: HTMLElement, listener: () => void): void {
	element.addEventListener('click', (e) => {
		if (e.button !== 0) return;
		listener();
	});
}

export function addLongPressAction(
	el: HTMLElement,
	delay: number | (() => number),
	onLongPress: (e: TouchEvent | MouseEvent) => void,
	options?: {
		stopImmediatePropagation?: boolean;
		onReleaseAfterLongPress?: (e: TouchEvent | MouseEvent) => void;
		onReleaseAfterNormalPress?: (e: TouchEvent | MouseEvent) => void;
		jitterTolerance?: number;
	}
): void {
	let timer: number | null = null;
	let longPressTriggered = false;

	let startX = 0;
	let startY = 0;

	const tolerance = options?.jitterTolerance ?? 6; // default 6px

	const getDelay = (): number =>
		typeof delay === 'function' ? delay() : delay;

	const getPoint = (e: TouchEvent | MouseEvent): { x: number; y: number; } => {
		if ('touches' in e && e.touches.length > 0) {
			return {
				x: e.touches[0].clientX,
				y: e.touches[0].clientY
			};
		}
		else if ('changedTouches' in e && e.changedTouches.length > 0) {
			return {
				x: e.changedTouches[0].clientX,
				y: e.changedTouches[0].clientY
			};
		}
		else {
			const m = e as MouseEvent;
			return {
				x: m.clientX,
				y: m.clientY
			};
		}
	};

	const exceededJitter = (e: TouchEvent | MouseEvent): boolean => {
		const { x, y } = getPoint(e);
		const dx = x - startX;
		const dy = y - startY;
		return (dx * dx + dy * dy) > (tolerance * tolerance);
	};

	const start = (e: TouchEvent | MouseEvent): void => {
		if (timer !== null) return;
		if (options?.stopImmediatePropagation) e.stopImmediatePropagation();

		longPressTriggered = false;

		const point = getPoint(e);
		startX = point.x;
		startY = point.y;

		timer = window.setTimeout(() => {
			timer = null;

			if (window.getSelection()?.toString()) return;

			longPressTriggered = true;
			onLongPress(e);
		}, getDelay());
	};

	const move = (e: TouchEvent | MouseEvent): void => {
		if (timer === null) return;

		if (exceededJitter(e)) {
			clearTimeout(timer);
			timer = null;
		}
	};

	const cancel = (e: TouchEvent | MouseEvent): void => {
		if (timer !== null) {
			clearTimeout(timer);
			timer = null;

			options?.onReleaseAfterNormalPress?.(e);
			return;
		}

		if (longPressTriggered) {
			options?.onReleaseAfterLongPress?.(e);

			// Delay reset so synthetic click (if any) can be suppressed
			setTimeout(() => {
				longPressTriggered = false;
			}, 0);
		}
	};

	addEvents(el,
		['touchstart', start, { passive: true }],
		['touchmove', move],
		['touchend', cancel],
		['touchcancel', cancel],

		['mousedown', start],
		['mousemove', move],
		['mouseup', cancel],
		['mouseleave', cancel],

		['click', (e: MouseEvent) => {
			if (longPressTriggered) {
				e.preventDefault();
				e.stopPropagation();
				longPressTriggered = false;
			}
		}]
	);
}


export function addHorizontalScroll(el: HTMLElement, scale: number = 1.0): () => void {
	const listener = (e: WheelEvent): void => {
		if (el.scrollWidth <= el.clientWidth) return;

		e.preventDefault();

		el.scrollLeft += e.deltaY * scale;
	};

	el.addEventListener('wheel', listener, { passive: false });
	return () => el.removeEventListener('wheel', listener);
}






export function append<T extends HTMLElement>(container: ParentNode, factory: () => T): T {
	const element = factory();
	container.appendChild(element);
	return element;
}

export function pushConfigured<T extends HTMLElement>(list: HTMLElement[], element: T, configure: (element: T) => void): T {
	configure(element);
	list.push(element);
	return element;
}

export function createElementsFun<T extends HTMLElement>(...creators: (() => T)[]): T[] {
	const elements: T[] = [];
	for (const creator of creators) {
		const element = creator();
		elements.push(element);
	}

	return elements;
}

export function configureSharedElements<T extends HTMLElement>(configure: (element: T) => void, elements: readonly T[]): readonly T[];
export function configureSharedElements<T extends HTMLElement>(configure: (element: T) => void, ...elements: readonly T[]): readonly T[];
export function configureSharedElements<T extends HTMLElement>(configure: (element: T) => void, ...elements: readonly T[]): readonly T[] {
	for (const element of elements) {
		configure(element);
	}
	return elements;
}

export function createSharedElements<T extends HTMLElement>(configure: (element: T) => void, ...creators: (() => T)[]): T[] {
	const elements = createElementsFun(...creators);
	for (const element of elements) {
		configure(element);
	}
	return elements;
}

export function createConfiguredElements<T extends HTMLElement>(creator: () => T, ...configures: ((element: T) => void)[]): T[] {
	const elements: T[] = [];
	for (const configure of configures) {
		const element = creator();
		configure(element);
		elements.push(element);
	}

	return elements;
}

export function createElement<K extends keyof HTMLElementTagNameMap>(
	tag: K,
	className?: string,
	text?: string
): HTMLElementTagNameMap[K] {
	const el = document.createElement(tag);
	if (className) el.className = className;
	if (text !== undefined) el.textContent = text;

	return el;
}

export function createDiv(className?: string): HTMLDivElement {
	const el = document.createElement('div');
	if (className !== undefined) el.className = className;
	return el;
}




type NativeProps<K extends keyof HTMLElementTagNameMap> =
	Omit<
		HTMLElementTagNameMap[K],
		'className' | 'dataset' | 'children' | 'textContent'
	>;

type ContentOptions =
	| { text: string; children?: never; }
	| { children: Node[]; text?: never; }
	| object;

export type ElementOptions<K extends keyof HTMLElementTagNameMap> =
	{
		className?: string;
		dataset?: Record<string, string>;
		events?: Partial<{
			[E in keyof GlobalEventHandlersEventMap]: (this: HTMLElementTagNameMap[K], ev: GlobalEventHandlersEventMap[E]) => void
		}>;
		classes?: readonly (string | null | undefined | false)[];
		parent?: HTMLElement;
	}
	& Partial<NativeProps<K>>
	& ContentOptions;

export function el<K extends keyof HTMLElementTagNameMap>(
	tag: K,
	options?: ElementOptions<K>
): HTMLElementTagNameMap[K] {
	const el = document.createElement(tag);
	if (!options) return el;

	const { className, dataset, events, classes } = options;

	if (className !== undefined) el.className = className;

	if (classes) {
		for (const c of classes) {
			if (c) el.classList.add(c);
		}
	}

	if (dataset) {
		for (const [k, v] of Object.entries(dataset)) {
			el.dataset[k] = v;
		}
	}

	if (events) {
		for (const [type, listener] of Object.entries(events)) {
			el.addEventListener(type, listener as EventListener);
		}
	}

	if ('text' in options) {
		el.textContent = options.text;
	}
	else if ('children' in options) {
		el.replaceChildren(...options.children);
	}

	if ('parent' in options) {
		options.parent.append(el);
	}

	const knownKeys = new Set([
		'className',
		'dataset',
		'events',
		'classes',
		'parent',
		'text',
		'children'
	]);

	for (const [key, value] of Object.entries(options)) {
		if (knownKeys.has(key)) continue;
		(el as any)[key] = value;
	}

	return el;
}








export function createWithClasses<K extends keyof HTMLElementTagNameMap>(
	tag: K,
	...classNames: string[]
): HTMLElementTagNameMap[K][] {
	return classNames.map(className =>
		el(tag, { className } as ElementOptions<K>)
	);
}

export function appendElement<K extends keyof HTMLElementTagNameMap>(
	container: HTMLElement,
	tag: K,
	className: string,
	text?: string
): HTMLElementTagNameMap[K] {
	const el = document.createElement(tag);
	el.className = className;
	if (text !== undefined) el.textContent = text;

	container.appendChild(el);
	return el;
}




function describeContainer(container: ParentNode): string {
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

export function queryOrThrow<T extends Element>(container: ParentNode | null | undefined, ctor: abstract new (...args: any[]) => T, selectors: string): T {
	if (container === null || container === undefined) {
		throw new Error(
			`queryOrThrow: Container does not exist`
		);
	}

	const element = container.querySelector(selectors);
	if (element == null) {
		throw new Error(
			`queryOrThrow: No element found for selector "${selectors}" inside ${describeContainer(container)}`
		);
	}

	if (!(element instanceof ctor)) {
		throw new Error(
			`queryOrThrow: Element matching "${selectors}" is a ${element.constructor.name}, expected ${ctor.name}`
		);
	}

	return element;
}

export function addOrRemoveClass(
	element: HTMLElement,
	condition: boolean,
	positiveTokens: string | string[],
	negativeTokens?: string | string[]
): boolean {
	const positives = forceArray(positiveTokens);
	const negatives = negativeTokens === undefined
		? undefined
		: forceArray(negativeTokens);

	const add = (tokens: string[] | undefined): void => {
		if (tokens) element.classList.add(...tokens);
	};
	const remove = (tokens: string[] | undefined): void => {
		if (tokens) element.classList.remove(...tokens);
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

export function toggleClasses(
	element: HTMLElement,
	condition: boolean,
	...tokens: string[]
): boolean {
	const method = condition ? 'add' : 'remove';
	element.classList[method](...tokens);
	return condition;
}

export function hasAnyClass(
	element: HTMLElement,
	...tokens: string[]
): boolean {
	for (const token of tokens) {
		if (element.classList.contains(token)) return true;
	}

	return false;
}



export function onResizeElement(
	element: HTMLElement,
	cb: (width: number, height: number) => void
): () => void {
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

export function setElementSize(
	element: HTMLElement,
	width?: number,
	height?: number
): void {
	for (const dimension of ['width', 'height'] as const) {
		const value = { width, height }[dimension];
		if (value === undefined) continue;

		element.style[dimension] = `${value}px`;
	}
}