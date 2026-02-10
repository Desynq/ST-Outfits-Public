


export function addDoubleTapListener(
	element: HTMLElement,
	listener: () => void
): void {
	const DOUBLE_TAP_MS = 300;
	let lastTapTime = 0;

	element.addEventListener('click', () => {
		const now = performance.now();
		const delta = now - lastTapTime;

		if (delta > 0 && delta < DOUBLE_TAP_MS) {
			navigator.vibrate?.(20);
			listener();
			lastTapTime = 0; // reset so triple-tap doesn't retrigger
			return;
		}

		lastTapTime = now;
	});
}

type Exclusion = HTMLElement | (() => HTMLElement | null | undefined);


export function addOnPointerDownOutside(
	callback: (e: PointerEvent) => void,
	...excluded: Exclusion[]
): () => void;

export function addOnPointerDownOutside(
	callback: (e: PointerEvent) => void,
	onExcludedHit: (el: HTMLElement) => void,
	...excluded: Exclusion[]
): () => void;

export function addOnPointerDownOutside(
	callback: (e: PointerEvent) => void,
	onExcludedHitOrFirstExcluded?: ((el: HTMLElement) => void) | Exclusion,
	...restExcluded: Exclusion[]
): () => void {

	const onExcludedHit = typeof onExcludedHitOrFirstExcluded === 'function'
		? onExcludedHitOrFirstExcluded
		: undefined;

	const excluded: Exclusion[] = typeof onExcludedHitOrFirstExcluded === 'function'
		? restExcluded
		: onExcludedHitOrFirstExcluded
			? [onExcludedHitOrFirstExcluded, ...restExcluded]
			: restExcluded;

	const listener = (e: PointerEvent) => {
		const target = e.target as Node;
		if (!target) return;

		if (excluded.length === 0) {
			callback(e);
			return;
		}

		for (const ex of excluded) {
			const el = typeof ex === 'function' ? ex() : ex;
			if (el && el.contains(target)) {
				onExcludedHit?.(el);
				return;
			}
		}

		callback(e);
	};

	document.addEventListener('pointerdown', listener, true);
	return () => document.removeEventListener('pointerdown', listener, true);
}