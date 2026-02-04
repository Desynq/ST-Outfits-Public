


export function indentString(text: string, spaces: number = 2): string {
	const pad = ' '.repeat(spaces);
	return text
		.split('\n')
		.map(line => pad + line)
		.join('\n');
}

export function toKebabCase(input: string): string {
	return input
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-') // replace spaces and symbols with -
		.replace(/^-+|-+$/g, ''); // trim leading/trailing -
}

export function toSnakeCase(input: string): string {
	return input
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_') // replace spaces and symbols with _
		.replace(/^_+|_+$/g, ''); // trim leading/trailing _
}