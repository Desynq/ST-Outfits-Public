export function createButton(className, text, click) {
    const btn = document.createElement('button');
    btn.className = className;
    btn.textContent = text;
    if (click)
        btn.addEventListener('click', (e) => click(e, btn));
    return btn;
}
export function createDerivedToggleButton(className, predicate, getText, click) {
    const btn = document.createElement('button');
    btn.className = className;
    btn.textContent = getText(predicate());
    btn.addEventListener('click', (e) => {
        const enabled = predicate();
        click(enabled, e);
        btn.textContent = getText(enabled);
    });
    return btn;
}
