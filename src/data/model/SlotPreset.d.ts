

export interface SlotPreset {
	value: string;
	imageKey: string;
	imageWidth: number;
	imageHeight: number;

	createdAt: number;
	lastUsedAt: number;
}

export interface KeyedSlotPreset extends SlotPreset {
	key: string; // used for activeImageTag
}