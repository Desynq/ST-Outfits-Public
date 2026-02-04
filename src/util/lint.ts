/**
 * Tagged template helper used ONLY for editor HTML syntax highlighting.
 *
 * This does NOT:
 * - escape values
 * - create DOM
 * - return a TemplateResult
 *
 * It simply concatenates strings and values into a plain string.
 */
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