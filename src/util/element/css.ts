


export function removeTokenFromAllIn(container: HTMLElement, token: string): void {
	for (const el of container.querySelectorAll('.' + token)) {
		el.classList.remove(token);
	}
}

export function mergeClassNames(...classNames: (string | false | undefined | null)[]): string {
	return classNames.filter(Boolean).join(' ');
}