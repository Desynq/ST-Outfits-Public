import { createElement } from "./ElementHelper.js";
export function promptImageUpload() {
    return new Promise(resolve => {
        const input = createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = () => {
            resolve(input.files?.[0] ?? null);
        };
        input.click();
    });
}
export function fileToBase64(file) {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
    });
}
export async function fetchBase64(url) {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    });
}
export async function resizeImage(file, maxWidth = 512) {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await new Promise(r => img.onload = r);
    const maxPixels = maxWidth ** 2;
    const pixels = img.width * img.height;
    let scale = 1;
    if (pixels > maxPixels) {
        scale = Math.sqrt(maxPixels / pixels);
    }
    const width = Math.round(img.width * scale);
    const height = Math.round(img.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    const base64 = canvas.toDataURL('image/webp', 0.85);
    return {
        base64: base64,
        height: canvas.height,
        width: canvas.width
    };
}
export async function hashBase64(base64) {
    const bytes = Uint8Array.from(atob(base64.split(',')[1]), c => c.charCodeAt(0));
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}
export function extensionFromBase64(base64) {
    const match = /^data:image\/([^;]+);base64/.exec(base64);
    return match?.[1];
}
export function getFileExtension(fileName) {
    return fileName.substring((fileName.lastIndexOf('.') + fileName.length) % fileName.length + 1)
        .toLowerCase()
        .trim();
}
