const smallWords = ['and', 'of', 'the', 'or', 'in', 'on', 'at'];
const smallWordsRegex = new RegExp(`\\b(${smallWords.join('|')})\\b`, 'gi');
export class RegexPipeline {
    constructor() {
        this.steps = [];
    }
    addStep(search, replace, name) {
        this.steps.push({ name, search, replace });
        return this;
    }
    hyphensToSpaces() {
        return this.addStep(/-/g, ' ', 'hyphens -> spaces');
    }
    titleCase() {
        return this.addStep(/\b\w/g, word => word.toUpperCase(), 'capitalize every word');
    }
    untitleSmallWords() {
        return this.addStep(smallWordsRegex, word => word.toLowerCase(), 'untitle small words');
    }
    titleFirstWord() {
        return this.addStep(/^./, word => word.toUpperCase(), 'title first word');
    }
    transform(str) {
        for (const { search, replace } of this.steps) {
            if (typeof replace === 'string') {
                str = str.replace(search, replace);
            }
            else {
                str = str.replace(search, replace);
            }
        }
        return str;
    }
}
