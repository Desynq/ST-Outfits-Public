import { ImageRef } from "./Outfit.js";



export interface ImageRegistry {
	getImageBlob(key: string): Promise<ImageBlob | undefined>;
	getImageRef(key: string): ImageRef | undefined;
	addImage(base64: string, width: number, height: number): Promise<string>;
	tryDeleteImage(key: string): Promise<boolean>;
}