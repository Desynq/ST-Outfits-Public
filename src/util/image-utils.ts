import { createElement } from "./ElementHelper";


export function promptImageUpload(): Promise<File | null> {
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

export function fileToBase64(file: File): Promise<string> {
	return new Promise(resolve => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.readAsDataURL(file);
	});
}

export async function resizeImage(file: File, maxWidth: number = 512): Promise<string> {
	const img = new Image();
	img.src = URL.createObjectURL(file);

	await new Promise(r => img.onload = r);

	const canvas = document.createElement('canvas');
	const scale = Math.min(1, maxWidth / img.width);
	canvas.width = img.width * scale;
	canvas.height = img.height * scale;

	const ctx = canvas.getContext('2d')!;
	ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

	return canvas.toDataURL('image/webp', 0.85);
}