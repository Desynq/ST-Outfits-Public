// @ts-ignore
import { getContext } from '../../../../../../extensions.js';

export function substituteParams(str: string): string {
	return getContext().substituteParams(str);
}