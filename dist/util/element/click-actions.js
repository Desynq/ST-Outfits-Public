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
