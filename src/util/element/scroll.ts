


export function captureScroll(
	element: HTMLElement,
	horizontal: boolean = false
): (el: HTMLElement) => void {
	const scrollDirection = horizontal ? 'scrollLeft' : 'scrollTop';

	const prevScroll = element[scrollDirection];

	return (el: HTMLElement) => requestAnimationFrame(() => {
		el[scrollDirection] = prevScroll;
	});
}

export function setScroll(
	element: HTMLElement,
	value: number | undefined | null,
	horizontal: boolean = false
): void {
	if (typeof value !== 'number') return;

	const scrollDirection = horizontal ? 'scrollLeft' : 'scrollTop';

	requestAnimationFrame(() => {
		element[scrollDirection] = value;
	});
}