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

			const exists = characters.map(c => c.name).includes(charName);
			if (!exists) {
				const msg = `"${charName}" is not a known character`;
				toastr.error(msg);
				return msg;
			}

			const { panel, created } = panelRegistry.getOrCreate(charName, saveSettings);
			if (!created) {
				panel.hide();
				reloadCurrentChat();
				return `Removed character panel for ${charName}`;
			}

			panel.autoOpen(undefined, 170);
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