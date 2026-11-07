



function isFontAwesomeIconValid(icon: HTMLElement): boolean {
	const content = getComputedStyle(icon, '::before').content;

	return content !== 'none'
		&& content !== 'normal'
		&& content !== '""'
		&& content !== "''"
		&& content !== '';
}

export function applyIconFallback(icon: HTMLElement): void {
	requestAnimationFrame(() => {
		if (isFontAwesomeIconValid(icon)) {
			return;
		}

		icon.className = 'fa-solid fa-circle-question';
		icon.title = 'Unknown or unavailable Font Awesome icon';
		icon.classList.add('--invalid-icon');
	});
}