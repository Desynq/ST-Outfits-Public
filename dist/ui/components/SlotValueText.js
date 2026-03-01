import { substituteParams } from "../../util/adapter/script-adapter.js";
import { addLongPressAction, el } from "../../util/ElementHelper.js";
import { branch } from "../../util/logic.js";
function iterateMacros(value) {
    return (function* () {
        let i = 0;
        while (i < value.length) {
            // Find opening {{
            if (value[i] === '{' && value[i + 1] === '{') {
                const start = i;
                i += 2;
                let depth = 1;
                while (i < value.length && depth > 0) {
                    if (value[i] === '{' && value[i + 1] === '{') {
                        depth++;
                        i += 2;
                        continue;
                    }
                    if (value[i] === '}' && value[i + 1] === '}') {
                        depth--;
                        i += 2;
                        continue;
                    }
                    i++;
                }
                if (depth === 0) {
                    const end = i;
                    const full = value.slice(start, end);
                    const content = full.slice(2, -2);
                    yield {
                        full,
                        content,
                        index: start,
                        end
                    };
                }
                else {
                    // Unbalanced braces — stop parsing
                    break;
                }
            }
            else {
                i++;
            }
        }
    })();
}
export class SlotValueText {
    constructor(deps) {
        this.deps = deps;
    }
    createFrag(value) {
        const frag = document.createDocumentFragment();
        const appendText = (start, end) => {
            const text = value.slice(start, end);
            frag.append(...this.renderTextWithRules(text));
        };
        let lastIndex = 0;
        for (const macro of iterateMacros(value)) {
            // Plain text before token
            if (macro.index > lastIndex) {
                appendText(lastIndex, macro.index);
            }
            const span = this.createMacroSpan(macro);
            frag.append(span);
            lastIndex = macro.end;
        }
        // Trailing text
        if (lastIndex < value.length) {
            appendText(lastIndex);
        }
        return frag;
    }
    renderTextWithRules(text) {
        const nodes = [];
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const rawLine = lines[i];
            const line = rawLine.trim();
            // --- Horizontal Rule
            if (line === '---') {
                const hr = el('hr', {
                    className: 'slot-value-hr'
                });
                nodes.push(hr);
            }
            // ### Header
            else if (line.startsWith('### ')) {
                const h3 = el('h3', {
                    className: 'slot-value-h3',
                    children: [
                        ...this.renderInlineFormatting(line.slice(4))
                    ]
                });
                nodes.push(h3);
            }
            // > Quote
            else if (line.startsWith('> ')) {
                const block = el('blockquote', {
                    className: 'slot-value-quote',
                    children: [
                        ...this.renderInlineFormatting(line.slice(2))
                    ]
                });
                nodes.push(block);
            }
            // Normal line
            else {
                nodes.push(...this.renderInlineFormatting(rawLine));
            }
            const isBlock = line === '---' ||
                line.startsWith('### ') ||
                line.startsWith('> ');
            // Preserves line breaks (except for the last line)
            if (i < lines.length - 1 && !isBlock) {
                nodes.push(document.createTextNode('\n'));
            }
        }
        return nodes;
    }
    renderInlineFormatting(text) {
        return this.parseInline(text);
    }
    parseInline(text) {
        const nodes = [];
        // Order matters: code first so it blocks inner parsing
        const regex = /`([^`]+)`|\*\*([\s\S]+?)\*\*|~~([\s\S]+?)~~|\*([\s\S]+?)\*|_([\s\S]+?)_/g;
        let lastIndex = 0;
        let match;
        while ((match = regex.exec(text)) !== null) {
            const start = match.index;
            // Plain text before match
            if (start > lastIndex) {
                nodes.push(document.createTextNode(text.slice(lastIndex, start)));
            }
            const [full, codeContent, boldContent, strikeContent, starItalicContent, underscoreItalicContent] = match;
            let elNode = null;
            // --- CODE (no recursive parsing)
            if (codeContent !== undefined) {
                elNode = el('code', {
                    className: 'slot-value-code',
                    text: codeContent
                });
            }
            // --- BOLD (recursive)
            else if (boldContent !== undefined) {
                elNode = el('strong', {
                    className: 'slot-value-bold',
                    children: this.parseInline(boldContent)
                });
            }
            // --- STRIKE (recursive)
            else if (strikeContent !== undefined) {
                elNode = el('del', {
                    className: 'slot-value-strike',
                    children: this.parseInline(strikeContent)
                });
            }
            // --- ITALIC (*)
            else if (starItalicContent !== undefined) {
                elNode = el('em', {
                    className: 'slot-value-italic',
                    children: this.parseInline(starItalicContent)
                });
            }
            // --- ITALIC (_)
            else if (underscoreItalicContent !== undefined) {
                elNode = el('em', {
                    className: 'slot-value-italic',
                    children: this.parseInline(underscoreItalicContent)
                });
            }
            if (elNode)
                nodes.push(elNode);
            lastIndex = start + full.length;
        }
        // Trailing text
        if (lastIndex < text.length) {
            nodes.push(document.createTextNode(text.slice(lastIndex)));
        }
        return nodes;
    }
    createMacroSpan(macro) {
        // macro static content does not change until rerender
        const text = macro.full;
        const isOutlet = macro.content.startsWith('outlet::');
        const isSpoiler = macro.content.startsWith('spoiler::');
        if (isSpoiler) {
            return this.createSpoilerSpan(macro);
        }
        const span = el('span', {
            className: 'slot-macro-span',
            text
        });
        const getPrompt = () => {
            const prompt = substituteParams(text);
            return prompt === text ? null : prompt;
        };
        const updateFromPrompt = () => {
            span.classList.remove('--error', '--char', '--user');
            const addClass = (...tokens) => span.classList.add(...tokens);
            const prompt = getPrompt();
            if (!prompt) {
                span.title = 'Error: No Prompt Found';
                addClass('--error');
                return null;
            }
            span.title = prompt;
            if (isOutlet) {
                span.textContent = prompt;
                return prompt;
            }
            branch(macro.content)
                .on('char', 'user', () => span.textContent = prompt)
                .on('char', () => addClass('--char'))
                .on('user', () => addClass('--user'))
                .run(() => addClass('--unknown'));
            return prompt;
        };
        updateFromPrompt();
        if (isOutlet) {
            const key = macro.content.slice('outlet::'.length);
            span.classList.add('--outlet');
            span.dataset.outletKey = key;
        }
        addLongPressAction(span, 300, () => {
            const prompt = updateFromPrompt();
            if (!prompt)
                this.deps.showPromptModal('No Prompt Found!');
            else
                this.deps.showPromptModal(prompt);
        }, { stopImmediatePropagation: true });
        return span;
    }
    createSpoilerSpan(macro) {
        const span = el('span', {
            className: 'slot-macro-span',
            text: macro.full
        });
        const inner = macro.content.slice('spoiler::'.length);
        span.classList.add('--spoiler');
        const placeholder = el('span', {
            className: 'spoiler-placeholder',
            text: '[Spoiler]'
        });
        const content = el('span', {
            className: 'spoiler-content'
        });
        const nodes = this.renderMacroText(inner);
        content.append(...nodes);
        span.replaceChildren(placeholder, content);
        const toggleReveal = () => {
            span.classList.toggle('--revealed');
            this.deps.expandValue();
        };
        span.addEventListener('click', e => {
            e.stopPropagation();
            toggleReveal();
        });
        return span;
    }
    renderMacroText(text) {
        const nodes = [];
        let lastIndex = 0;
        for (const macro of iterateMacros(text)) {
            if (macro.index > lastIndex) {
                nodes.push(document.createTextNode(text.slice(lastIndex, macro.index)));
            }
            nodes.push(this.createMacroSpan(macro));
            lastIndex = macro.end;
        }
        if (lastIndex < text.length) {
            nodes.push(document.createTextNode(text.slice(lastIndex)));
        }
        return nodes;
    }
}
