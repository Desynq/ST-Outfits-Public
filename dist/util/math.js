export function clamp({ value, min, max }) {
    if (max < min) {
        return min;
    }
    return Math.min(Math.max(value, min), max);
}
export function fraction(frac) {
    const match = frac.match(/^([+-]?\d+)\s*\/\s*([+-]?\d+)$/);
    if (!match) {
        throw new Error('Invalid fraction');
    }
    const numerator = Number(match[1]);
    const denominator = Number(match[2]);
    if (denominator === 0) {
        throw new Error('Division by zero');
    }
    return numerator / denominator;
}
