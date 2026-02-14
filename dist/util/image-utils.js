import { createElement } from "./ElementHelper";
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
export async function resizeImage(file, maxWidth = 512) {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await new Promise(r => img.onload = r);
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, maxWidth / img.width);
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/webp', 0.85);
}
