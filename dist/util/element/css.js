export function removeTokenFromAllIn(container, token) {
    for (const el of container.querySelectorAll('.' + token)) {
        el.classList.remove(token);
    }
}
export function mergeClassNames(...classNames) {
    return classNames.filter(Boolean).join(' ');
}
export function getLineHeightPx(el) {
    const style = getComputedStyle(el);
    const lineHeight = parseFloat(style.lineHeight);
    if (Number.isFinite(lineHeight))
        return lineHeight;
    const fontSize = parseFloat(style.fontSize);
    return fontSize * 1.2;
}
export function rAFs(frames, fn) {
    if (frames <= 0) {
        fn();
        return;
    }
    let count = 0;
    const tick = () => {
        if (++count >= frames) {
            fn();
        }
        else {
            requestAnimationFrame(tick);
        }
    };
    requestAnimationFrame(tick);
}
export function hasTransitionFor(el, ...props) {
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
function parseCssTimeMs(value) {
    const trimmed = value.trim();
    if (trimmed.endsWith('ms')) {
        return parseFloat(trimmed);
    }
    if (trimmed.endsWith('s')) {
        return parseFloat(trimmed) * 1000;
    }
    return 0;
}
export function getTransitionFor(el, prop) {
    const style = getComputedStyle(el);
    const properties = style.transitionProperty.split(',').map(s => s.trim());
    const durations = style.transitionDuration.split(',').map(parseCssTimeMs);
    const delays = style.transitionDelay.split(',').map(parseCssTimeMs);
    const maxLen = Math.max(properties.length, durations.length, delays.length);
    let best = null;
    for (let i = 0; i < maxLen; i++) {
        const property = properties[i] ?? properties[properties.length - 1];
        const durationMs = durations[i] ?? durations[durations.length - 1] ?? 0;
        const delayMs = delays[i] ?? delays[delays.length - 1] ?? 0;
        const totalMs = durationMs + delayMs;
        if (property !== prop && property !== 'all')
            continue;
        if (totalMs <= 0)
            continue;
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
export function triggerAfterTransition(el, prop, fn) {
    const transition = getTransitionFor(el, prop);
    if (!transition) {
        fn();
        return;
    }
    let done = false;
    const finish = () => {
        if (done)
            return;
        done = true;
        el.removeEventListener('transitionend', onFinish);
        el.removeEventListener('transitioncancel', onFinish);
        clearTimeout(timeoutId);
        fn();
    };
    const onFinish = (event) => {
        if (event.target !== el)
            return;
        if (event.propertyName !== prop)
            return;
        finish();
    };
    el.addEventListener('transitionend', onFinish);
    el.addEventListener('transitioncancel', onFinish);
    const timeoutId = window.setTimeout(finish, transition.totalMs + 50);
}
export function triggerAfterLayout(el, fn) {
    const observer = new ResizeObserver(() => {
        observer.disconnect();
        fn();
    });
    observer.observe(el);
}
