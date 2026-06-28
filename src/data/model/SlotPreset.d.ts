

export interface SlotPresetV1 {
	value: string;
	imageKey: string;
	imageWidth: number;
	imageHeight: number;

	createdAt: number;
	lastUsedAt: number;
}

export interface SlotPreset {
	value: string;
	image?: {
		key: string;
		width: number;
		height: number;
	};
	createdAt: number;
	lastUsedAt: number;
}

export interface KeyedSlotPreset extends SlotPreset {
	key: string; // used for activeImageTag
};

export type KeyedSlotPresetWithImage = KeyedSlotPreset & {
	image: NonNullable<KeyedSlotPreset['image']>;
};