


export function addEvents(
	el: HTMLElement,
	...adds: {
		[K in keyof HTMLElementEventMap]:
		readonly [
			type: K,
			listener: (ev: HTMLElementEventMap[K]) => void,
			options?: boolean | AddEventListenerOptions
		]
	}[keyof HTMLElementEventMap][]
): void {
	for (const [type, listener, options] of adds) {
		el.addEventListener(type, listener as EventListener, options);
	}
}