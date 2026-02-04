import { toSnakeCase } from "./StringHelper.js";


export function toSummaryKey(kind: string): string {
	return toSnakeCase(kind) + '_summary';
}