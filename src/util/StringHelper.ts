


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

/**
 * @example 'foo-bar' => 'Foo Bar'
 */
export function fromKebabCase(value: string): string {
	return value
		.trim()
		.split('-')
		.filter(Boolean)
		.map(word =>
			word.charAt(0).toUpperCase() +
			word.slice(1).toLowerCase()
		)
		.join(' ');
}




export function toSnakeCase(input: string): string {
	return input
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_') // replace spaces and symbols with _
		.replace(/^_+|_+$/g, ''); // trim leading/trailing _
}

export function toCamelCase(input: string): string {
	return input
		.trim()
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.filter(Boolean)
		.map((word, index) => {
			return index === 0
				? word
				: word[0].toUpperCase() + word.slice(1);
		})
		.join('');
}

export function toPascalCase(input: string): string {
	return input
		.trim()
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.filter(Boolean)
		.map(word => word[0].toUpperCase() + word.slice(1))
		.join('');
}



export function resolveKebabCase(input: string): string | null {
	const cleaned = input
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, '')
		.replace(/\s+/g, '-');

	return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(cleaned)
		? cleaned
		: null;
}



export function plural(count: number): '' | 's';
export function plural<T extends string, V extends string>(
	count: number,
	singular: T,
	plural: V
): T | V;

export function plural(
	count: number,
	singular = '',
	plural = 's'
): string {
	return count === 1 ? singular : plural;
}



export function stringIf<T extends string>(condition: boolean, value: T): T | '' {
	return condition ? value : '';
}