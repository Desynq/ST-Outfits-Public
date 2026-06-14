


export type CurrentCharacterProvider = () => string | null;

export function getCurrentCharacterKey(): string | null {
	const context = SillyTavern.getContext();
	const character = context.characters[context.characterId];

	return character?.name ?? null;
}