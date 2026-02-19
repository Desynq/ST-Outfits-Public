import { ImageBlob, OutfitImage } from "../../data/model/Outfit.js";
import { OutfitImageState } from "../../data/model/OutfitImageState.js";
import { multiConfirm, popupConfirm } from "../../util/adapter/popup-adapter.js";
import { removeTokenFromAllIn } from "../../util/element/css.js";
import { addLongPressAction, createElement } from "../../util/ElementHelper.js";



export interface ImagePickerOptions {
	imageStates: OutfitImageState[];
	onDelete: (tag: string) => Promise<void> | void;
}

export async function showImagePicker(
	options: ImagePickerOptions
): Promise<string | null> {
	const { imageStates, onDelete } = options;

	const container = createElement('div', 'image-picker');
	let selected: string | null = null;

	for (const state of imageStates) {
		const { tag, image, blob } = state;

		const wrapper = createElement('div', 'image-picker-item');

		const img = createElement('img');
		img.src = blob.base64;
		img.width = 96;
		img.height = Math.round(96 * (blob.height / blob.width));

		const label = createElement('div', undefined, tag);

		wrapper.append(img, label);

		const onReleaseAfterNormalPress = () => {
			selected = tag;
			removeTokenFromAllIn(container, 'selected');
			wrapper.classList.add('selected');
		};

		const onLongPress = async () => {
			const confirm = await multiConfirm(
				'Delete this image?',
				'This action cannot be undone. Confirm?'
			);
			if (!confirm) return;

			await onDelete(tag);
			selected = null;
			wrapper.remove();
		};

		addLongPressAction(
			wrapper,
			300,
			onLongPress,
			{ onReleaseAfterNormalPress }
		);

		container.append(wrapper);
	}

	const confirmed = await popupConfirm(container, {
		title: 'Choose Image',
		okText: 'Select',
		cancelText: 'Cancel',
		wide: true
	});

	if (!confirmed || !selected) return null;

	return selected;
}