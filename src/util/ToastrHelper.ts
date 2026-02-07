



export function toastrClipboard(
	type: ToastrType,
	copyText: string,
	message: string,
	title?: string,
	copyToast: { message: string; type?: ToastrType; } =
		{ type: 'success', message: `Copied ${copyText} to clipboard` }
): void {
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

	toastr[type](
		message,
		title,
		{
			onclick,
			escapeHtml: false,
			tapToDismiss: false
		}
	);
}