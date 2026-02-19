


export function removeTokenFromAllIn(container: HTMLElement, token: string): void {
	for (const el of container.querySelectorAll('.' + token)) {
		el.classList.remove(token);
	}
}