export function conditionalList(...items) {
    const list = [];
    for (const item of items) {
        if (Array.isArray(item)) {
            if (item[0]) {
                list.push(item[1]);
            }
        }
        else {
            list.push(item);
        }
    }
    return list;
}
