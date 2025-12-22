


export namespace ElementHelper {

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
}