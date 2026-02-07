export function toastrClipboard(type, copyText, message, title, copyToast = { type: 'success', message: `Copied ${copyText} to clipboard` }) {
    const onclick = async () => {
        try {
            await navigator.clipboard.writeText(copyText);
            if (copyToast)
                toastr[copyToast.type ?? 'info'](copyToast.message);
        }
        catch {
            toastr.error(`Failed to copy ${copyText} to clipboard.`);
        }
    };
    toastr[type](message, title, {
        onclick,
        escapeHtml: false,
        tapToDismiss: false
    });
}
