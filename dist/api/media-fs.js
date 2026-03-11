import { saveBase64AsFile as _saveBase64AsFile
// @ts-ignore
 } from '../../../../../utils.js';
import { deleteMediaFromServer as _deleteMediaFromServer
// @ts-ignore
 } from '../../../../../chats.js';
export function saveBase64AsFile(base64Data, subFolder, fileName, extension) {
    return _saveBase64AsFile(base64Data, subFolder, fileName, extension);
}
export function deleteMediaFromServer(url, silent = false) {
    return _deleteMediaFromServer(url, silent);
}
