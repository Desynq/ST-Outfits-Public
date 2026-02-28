import { clamp } from "../math.js";
export function clampPosition({ element, x, y, width, height }) {
    const maxX = Math.max(0, window.innerWidth - width);
    const maxY = Math.max(0, window.innerHeight - height);
    const clampedX = clamp({ value: x, min: 0, max: maxX });
    const clampedY = clamp({ value: y, min: 0, max: maxY });
    element.style.left = `${clampedX}px`;
    element.style.top = `${clampedY}px`;
}
export function clampSize(element) {
    const rect = element.getBoundingClientRect();
    const maxWidth = window.innerWidth - rect.left;
    const maxHeight = window.innerHeight - rect.top;
    element.style.maxWidth = `${maxWidth}px`;
    element.style.maxHeight = `${maxHeight}px`;
}
export function enforceViewportBounds(element) {
    const rect = element.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width;
    const maxY = window.innerHeight - rect.height;
    const x = clamp({ value: rect.left, min: 0, max: maxX });
    const y = clamp({ value: rect.top, min: 0, max: maxY });
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
    element.style.maxWidth = `${window.innerWidth - x}px`;
    element.style.maxHeight = `${window.innerHeight - y}px`;
}
