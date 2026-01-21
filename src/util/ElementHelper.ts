



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

export function createElements<T extends HTMLElement>(creator: () => T, ...configures: ((element: T) => void)[]): T[] {
	const elements: T[] = [];
	for (const configure of configures) {
		const element = creator();
		configure(element);
		elements.push(element);
	}
	return elements;
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

export function queryOrThrow<T extends Element>(container: ParentNode, ctor: abstract new (...args: any[]) => T, selectors: string): T {
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