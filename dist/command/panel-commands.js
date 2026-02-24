import { html } from "../util/lint.js";
const { SlashCommandParser, SlashCommand, SlashCommandNamedArgument, ARGUMENT_TYPE, characters } = SillyTavern.getContext();
export function registerPanelCommands(panelRegistry, saveSettings) {
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'outfit-char',
        callback: (namedArgs, unnamedArgs) => {
            const charName = unnamedArgs.toString().trim();
            if (!charName) {
                toastr.error(`Character name must be non-empty`);
                return '';
            }
            const exists = characters.map(c => c.name).includes(charName);
            if (!exists) {
                toastr.error(`"${charName}" is not a known character`);
                return '';
            }
            const panel = panelRegistry.getOrCreate(charName, saveSettings);
            panel.autoOpen(undefined, 170);
            return charName;
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
        helpString: html `
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
