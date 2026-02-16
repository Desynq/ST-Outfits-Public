


export function addDoubleTapListener(
	element: HTMLElement,
	onDouble: (e: PointerEvent) => void,
	delay: number = 300,
	onSingle?: (e: PointerEvent) => void,
	onFirst?: (delay: number, e: PointerEvent) => void
): () => void {
	let lastTapTime = 0;
	let singleTapTimer: number | null = null;

	const listener = (e: PointerEvent) => {
		const now = performance.now();
		const delta = now - lastTapTime;

		if (delta > 0 && delta < delay) {
			// Double tap detected
			if (singleTapTimer !== null) {
				clearTimeout(singleTapTimer);
				singleTapTimer = null;
			}

			navigator.vibrate?.(20);
			onDouble(e);
			lastTapTime = 0;
			return;
		}

		lastTapTime = now;
		onFirst?.(delay, e);

		if (onSingle) {
			singleTapTimer = window.setTimeout(() => {
				onSingle(e);
				singleTapTimer = null;
			}, delay);
		}
	};

	element.addEventListener('click', listener);
	return () => element.removeEventListener('click', listener);
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