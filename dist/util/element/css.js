export function removeTokenFromAllIn(container, token) {
    for (const el of container.querySelectorAll('.' + token)) {
        el.classList.remove(token);
    }
}
export function mergeClassNames(...classNames) {
    return classNames.filter(Boolean).join(' ');
}
