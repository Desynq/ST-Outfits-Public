



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


export function addLeftClickListener(element: HTMLElement, listener: () => void): void {
	element.addEventListener('click', (e) => {
		if (e.button !== 0) return;
		listener();
	});
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

export function createElements<T extends HTMLElement>(...creators: (() => T)[]): T[] {
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
	const elements = createElements(...creators);
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