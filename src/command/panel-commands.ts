import { CharOutfitPanel } from "../panel/CharOutfitPanel.js";
import { OutfitPanelRegistry } from "../panel/PanelRegistry.js";
import { html } from "../util/lint.js";

const {
	SlashCommandParser,
	SlashCommand,
	SlashCommandNamedArgument,
	ARGUMENT_TYPE,
	characters,
	reloadCurrentChat
} = SillyTavern.getContext();



type AttemptSuccess<T> = { ok: true; value: T; };

type AttemptFailure = {
	ok: false;
	error: unknown;
};
type AttemptFailureWithToastr = AttemptFailure & {
	toastr: string;
};

function attempt<T>(
	fn: () => T,
	options: {
		log: string;
		toastr: string;
		meta?: (error: unknown) => Record<string, unknown>;
	}
): AttemptSuccess<T> | AttemptFailureWithToastr;

function attempt<T>(
	fn: () => T,
	options: {
		log: string;
		meta?: (error: unknown) => Record<string, unknown>;
	}
): AttemptSuccess<T> | AttemptFailure;

function attempt<T>(
	fn: () => T,
	options: {
		log: string;
		toastr?: string;
		meta?: (error: unknown) => Record<string, unknown>;
	}
) {
	try {
		return { ok: true, value: fn() };
	} catch (error) {
		console.error(options.log, {
			error,
			...(options.meta?.(error) ?? {})
		});

		if (options.toastr) {
			toastr.error(options.toastr);
			return { ok: false, error, toastr: options.toastr };
		}

		return { ok: false, error };
	}
}



export function registerPanelCommands(panelRegistry: OutfitPanelRegistry, saveSettings: () => void): void {

	// Current fix for outlet macros going away on command use is to reload the current chat

	SlashCommandParser.addCommandObject(SlashCommand.fromProps({
		name: 'outfit-char',
		callback: (namedArgs: unknown, unnamedArgs: string) => {
			const charName = unnamedArgs.toString().trim();
			if (!charName) {
				const msg = `Character name must be non-empty`;
				toastr.error(msg);
				return msg;
			}

			const createResult = attempt(
				() => panelRegistry.getOrCreate(charName, saveSettings),
				{
					toastr: `Failed to create panel for ${charName}`,
					log: '[Outfits] getOrCreate failed:',
					meta: () => ({ character: charName })
				}
			);
			if (!createResult.ok) return createResult.toastr;

			const { panel, created } = createResult.value;

			if (!created) {
				const hideResult = attempt(
					() => panel.hide(),
					{
						toastr: `Panel removal failed for ${charName}`,
						log: '[Outfits] panel.hide failed:',
						meta: () => ({ character: charName })
					}
				);

				if (!hideResult.ok) return hideResult.toastr;

				reloadCurrentChat();
				return `Removed character panel for ${charName}`;
			}

			const openResult = attempt(
				() => panel.autoOpen(20, 170),
				{
					toastr: `Panel opened but failed for render for ${charName}`,
					log: '[Outfits] panel.autoOpen failed:',
					meta: () => ({ character: charName })
				}
			);

			if (!openResult.ok) return openResult.toastr;

			reloadCurrentChat();
			return `Showed character panel for ${charName}`;
		},
		aliases: ['outfit-char'],
		returns: 'the character name if successful, or nothing if not successful',
		unnamedArgumentsList: [
			SlashCommandNamedArgument.fromProps({
				description: 'The character name',
				typeList: ARGUMENT_TYPE.STRING,
				isRequired: true
			})
		],
		helpString: html`
			<div>
				Opens a new character panel for the provided character name if it exists
			</div>
			<div>
				<strong>Example:</strong>
				<ul>
					<li>
						<pre><code class="language-stscript">/outfit-char John Doe</code></pre>
						returns "John Doe" if John Doe is a character, otherwise ""
					</li>
				</ul>
			</div>
		`
	}));
}