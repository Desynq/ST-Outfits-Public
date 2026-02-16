export function addDoubleTapListener(element, onDouble, delay = 300, onSingle, onFirst) {
    let lastTapTime = 0;
    let singleTapTimer = null;
    const listener = (e) => {
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
