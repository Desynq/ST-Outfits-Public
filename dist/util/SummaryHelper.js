import { toKebabCase } from "./StringHelper.js";
export function toSummaryKey(kind) {
    return toKebabCase(kind);
}
