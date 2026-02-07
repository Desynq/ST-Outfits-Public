


export function createButton(className: string, text: string, click?: (e: PointerEvent, el: HTMLButtonElement) => void): HTMLButtonElement {
	const btn = document.createElement('button');
	btn.className = className;
	btn.textContent = text;
	if (click) btn.addEventListener('click', (e) => click(e, btn));
	return btn;
}

export function createDerivedToggleButton(
	className: string,
	predicate: () => boolean,
	getText: (enabled: boolean) => string,
	click: (enabled: boolean, e: PointerEvent) => void
): HTMLButtonElement {
	const btn = document.createElement('button');
	btn.className = className;
	btn.textContent = getText(predicate());

	btn.addEventListener('click', (e) => {
		const enabled = predicate();
		click(enabled, e);
		btn.textContent = getText(enabled);
	});

	return btn;
}