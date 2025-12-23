


export namespace StringHelper {
	export function indent(text: string, spaces: number = 2): string {
		const pad = ' '.repeat(spaces);
		return text
			.split('\n')
			.map(line => pad + line)
			.join('\n');
	}
}