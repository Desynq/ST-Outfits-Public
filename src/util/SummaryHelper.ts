import { toCamelCase, toKebabCase } from "./StringHelper.js";


export function toSummaryKey(kind: string): string {
	return toKebabCase(kind);
}