export var StringHelper;
(function (StringHelper) {
    function indent(text, spaces = 2) {
        const pad = ' '.repeat(spaces);
        return text
            .split('\n')
            .map(line => pad + line)
            .join('\n');
    }
    StringHelper.indent = indent;
})(StringHelper || (StringHelper = {}));
