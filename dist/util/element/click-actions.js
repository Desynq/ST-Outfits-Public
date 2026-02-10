export function addDoubleTapListener(element, listener) {
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
export function addOnPointerDownOutside(callback, onExcludedHitOrFirstExcluded, ...restExcluded) {
    const onExcludedHit = typeof onExcludedHitOrFirstExcluded === 'function'
        ? onExcludedHitOrFirstExcluded
        : undefined;
    const excluded = typeof onExcludedHitOrFirstExcluded === 'function'
        ? restExcluded
        : onExcludedHitOrFirstExcluded
            ? [onExcludedHitOrFirstExcluded, ...restExcluded]
            : restExcluded;
    const listener = (e) => {
        const target = e.target;
        if (!target)
            return;
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
