// @ts-ignore
import { getContext as _getContext } from '../../../../../../extensions.js';

export function substituteParams(content: string): string {
	return SillyTavern.getContext().substituteParams(content);
}