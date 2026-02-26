export function clamp({ value, min, max }) {
    if (max < min) {
        return min;
    }
    return Math.min(Math.max(value, min), max);
}
