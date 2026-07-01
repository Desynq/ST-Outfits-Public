


export function getCurrentCharacterName(): string | undefined {
	const context = SillyTavern.getContext();
	const charName = context.characters[context.characterId]?.name;
	return charName;
}