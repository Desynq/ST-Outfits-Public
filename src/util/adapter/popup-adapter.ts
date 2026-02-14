import { POPUP_RESULT, POPUP_TYPE, Popup } from '../../../../../../popup.js';

export interface PopupConfirmOptions {
	title?: string;
	okText?: string;
	cancelText?: string | false | null;
	wide?: boolean;
	large?: boolean;
	leftAlign?: boolean;
}

export async function popupConfirm(
	content: string | HTMLElement,
	options: PopupConfirmOptions = {}
): Promise<boolean> {
	const config = {
		title: '',
		okText: 'OK',
		cancelText: 'Cancel',
		wide: false,
		large: false,
		leftAlign: false,
		...options
	} satisfies Required<PopupConfirmOptions>;

	const popup = new Popup(
		content,
		POPUP_TYPE.CONFIRM,
		config.title,
		{
			okButton: config.okText,
			cancelButton: config.cancelText,
			wide: config.wide,
			large: config.large,
			leftAlign: config.leftAlign,
		}
	);

	const result = await popup.show();

	return result === POPUP_RESULT.AFFIRMATIVE;
}