export function html(
	strings: TemplateStringsArray,
	...values: unknown[]
): string {
	let out = strings[0];

	for (let i = 0; i < values.length; i++) {
		out += String(values[i]) + strings[i + 1];
	}

	return out;
}