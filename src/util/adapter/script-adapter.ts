// @ts-ignore
import { getContext as _getContext } from '../../../../../../extensions.js';

export function substituteParams(str: string): string {
	return _getContext().substituteParams(str);
}

export function getContext() {
	return _getContext();
}