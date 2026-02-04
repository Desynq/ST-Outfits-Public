import { toSnakeCase } from "./StringHelper.js";
export function toSummaryKey(kind) {
    return toSnakeCase(kind) + '_summary';
}
