


export function removeTokenFromAllIn(container: HTMLElement, token: string): void {
	for (const el of container.querySelectorAll('.' + token)) {
		el.classList.remove(token);
	}
}

export function mergeClassNames(...classNames: (string | false | undefined | null)[]): string {
	return classNames.filter(Boolean).join(' ');
}



export function getLineHeightPx(el: HTMLElement): number {
	const style = getComputedStyle(el);
	const lineHeight = parseFloat(style.lineHeight);

	if (Number.isFinite(lineHeight)) return lineHeight;

	const fontSize = parseFloat(style.fontSize);
	return fontSize * 1.2;
}



export function rAFs(frames: number, fn: () => void): void {
	if (frames <= 0) {
		fn();
		return;
	}

	let count = 0;

	const tick = (): void => {
		if (++count >= frames) {
			fn();
		}
		else {
			requestAnimationFrame(tick);
		}
	};

	requestAnimationFrame(tick);
}



export function hasTransitionFor(el: HTMLElement, ...props: string[]): boolean {
	const style = getComputedStyle(el);
	const targets = new Set(props);

	const properties = style.transitionProperty.split(',').map(s => s.trim());
	const durations = style.transitionDuration.split(',').map(s => parseFloat(s));
	const delays = style.transitionDelay.split(',').map(s => parseFloat(s));

	const maxLen = Math.max(properties.length, durations.length, delays.length);

	for (let i = 0; i < maxLen; i++) {
		const prop = properties[i] ?? properties[properties.length - 1];
		const duration = durations[i] ?? durations[durations.length - 1];
		const delay = delays[i] ?? delays[delays.length - 1];

		const hasProp = prop === 'all' || targets.has(prop);

		if (hasProp && (duration > 0 || delay > 0)) {
			return true;
		}
	}

	return false;
}



export interface TransitionInfo {
	property: string;
	durationMs: number;
	delayMs: number;
	totalMs: number;
}

function parseCssTimeMs(value: string): number {
	const trimmed = value.trim();

	if (trimmed.endsWith('ms')) {
		return parseFloat(trimmed);
	}

	if (trimmed.endsWith('s')) {
		return parseFloat(trimmed) * 1000;
	}

	return 0;
}

export function getTransitionFor(el: HTMLElement, prop: string): TransitionInfo | null {
	const style = getComputedStyle(el);

	const properties = style.transitionProperty.split(',').map(s => s.trim());
	const durations = style.transitionDuration.split(',').map(parseCssTimeMs);
	const delays = style.transitionDelay.split(',').map(parseCssTimeMs);

	const maxLen = Math.max(properties.length, durations.length, delays.length);

	let best: TransitionInfo | null = null;

	for (let i = 0; i < maxLen; i++) {
		const property = properties[i] ?? properties[properties.length - 1];
		const durationMs = durations[i] ?? durations[durations.length - 1] ?? 0;
		const delayMs = delays[i] ?? delays[delays.length - 1] ?? 0;
		const totalMs = durationMs + delayMs;

		if (property !== prop && property !== 'all') continue;
		if (totalMs <= 0) continue;

		const transition = {
			property,
			durationMs,
			delayMs,
			totalMs,
		};

		if (!best || transition.totalMs > best.totalMs) {
			best = transition;
		}
	}

	return best;
}




export function triggerAfterTransition(
	el: HTMLElement,
	prop: string,
	fn: () => void,
): void {
	const transition = getTransitionFor(el, prop);

	if (!transition) {
		fn();
		return;
	}

	let done = false;

	const finish = (): void => {
		if (done) return;

		done = true;
		el.removeEventListener('transitionend', onFinish);
		el.removeEventListener('transitioncancel', onFinish);
		clearTimeout(timeoutId);
		fn();
	};

	const onFinish = (event: TransitionEvent): void => {
		if (event.target !== el) return;
		if (event.propertyName !== prop) return;

		finish();
	};

	el.addEventListener('transitionend', onFinish);
	el.addEventListener('transitioncancel', onFinish);

	const timeoutId = window.setTimeout(finish, transition.totalMs + 50);
}



export function triggerAfterLayout(el: HTMLElement, fn: () => void): void {
	const observer = new ResizeObserver(() => {
		observer.disconnect();
		fn();
	});

	observer.observe(el);
}