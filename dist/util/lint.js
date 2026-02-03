export function html(strings, ...values) {
    let out = strings[0];
    for (let i = 0; i < values.length; i++) {
        out += String(values[i]) + strings[i + 1];
    }
    return out;
}
