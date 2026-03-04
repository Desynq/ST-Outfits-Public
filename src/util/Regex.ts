

type ReplaceFn = (substring: string, ...args: any[]) => string;

interface Step {
	name: string | undefined;
	search: RegExp;
	replace: string | ReplaceFn;
}



const smallWords = ['and', 'of', 'the', 'or', 'in', 'on', 'at'] as const;

const smallWordsRegex = new RegExp(
	`\\b(${smallWords.join('|')})\\b`,
	'gi'
);

export class RegexPipeline {

	private readonly steps: Step[] = [];

	public addStep(
		search: RegExp,
		replace: string | ReplaceFn,
		name?: string
	): this {
		this.steps.push({ name, search, replace });
		return this;
	}

	public hyphensToSpaces(): this {
		return this.addStep(/-/g, ' ', 'hyphens -> spaces');
	}

	public titleCase(): this {
		return this.addStep(/\b\w/g, word => word.toUpperCase(), 'capitalize every word');
	}

	public untitleSmallWords(): this {
		return this.addStep(smallWordsRegex, word => word.toLowerCase(), 'untitle small words');
	}

	public titleFirstWord(): this {
		return this.addStep(/^./, word => word.toUpperCase(), 'title first word');
	}

	public transform(str: string): string {
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