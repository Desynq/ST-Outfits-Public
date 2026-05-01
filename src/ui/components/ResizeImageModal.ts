import { Popup } from "../../../../../../popup.js";
import { OutfitSlotState } from "../../data/model/OutfitSnapshots.js";
import { popupConfirm } from "../../util/adapter/popup-adapter.js";
import { el } from "../../util/ElementHelper.js";




export async function promptImageResize(
	deps: {
		slot: OutfitSlotState;
		imgWrapper: HTMLElement;
		saveImageResize: (width: number, height: number) => Promise<void>;
		completeResize: () => void;
	}
): Promise<void> {
	const image = deps.slot.getActiveImageState();
	if (!image) {
		throw new Error('Attempted resizing undefined image.');
	}


	const content = el('div', {
		className: 'resize-prompt-content'
	});

	const inputsRow = el('div', {
		className: 'inputs-row',
		parent: content
	});

	const actionsRow = el('div', {
		className: 'actions-row',
		parent: content
	});


	const renderInput = (text: string, value: number): HTMLInputElement => {
		const div = el('div', {
			className: 'input-div',
			parent: inputsRow
		});

		const caption = el('div', {
			text: text,
			parent: div
		});

		const input = el('input', {
			type: 'number',
			value: value.toString(),
			min: '24',
			max: '1024',
			step: '12',
			parent: div
		});
		return input;
	};

	const widthInput = renderInput('Width', deps.imgWrapper.offsetWidth);
	const heightInput = renderInput('Height', deps.imgWrapper.offsetHeight);

	const matchAspectRatio = (): void => {
		const width = Number(widthInput.value);
		const height = Math.round(width * image.ref.height / image.ref.width);
		heightInput.value = height.toString();
	};

	const applyResize = async (): Promise<void> => {
		const width = Number(widthInput.value);
		const height = Number(heightInput.value);

		if (!width || !height) return;

		await deps.saveImageResize(width, height);
		deps.completeResize();
	};

	const renderWidthPreset = (width: number): void => {
		el('button', {
			className: 'menu_button',
			text: `${width}px`,
			events: {
				click: async () => {
					widthInput.value = width.toString();
					matchAspectRatio();

					await popupRef.completeAffirmative();
				}
			},
			parent: actionsRow
		});
	};


	el('button', {
		className: 'menu_button',
		text: '⇅ Fit Height',
		events: {
			click: () => matchAspectRatio()
		},
		parent: actionsRow
	});

	renderWidthPreset(48);
	renderWidthPreset(96);
	renderWidthPreset(128);
	renderWidthPreset(196);
	renderWidthPreset(256);

	let popupRef: Popup;

	const confirmed = await popupConfirm(content, {
		title: 'Resize Image',
		okText: 'Apply',
		onOpen: (popup) => {
			popupRef = popup;
		}
	});

	if (!confirmed) return;

	await applyResize();
}