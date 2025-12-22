export var ElementHelper;
(function (ElementHelper) {
    function addContextActionListener(element, listener, longPressMs = 550) {
        element.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            listener();
        });
        // mobile support
        let timer = null;
        element.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'mouse')
                return;
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
    ElementHelper.addContextActionListener = addContextActionListener;
})(ElementHelper || (ElementHelper = {}));
