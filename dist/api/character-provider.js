export function getCurrentCharacterKey() {
    const context = SillyTavern.getContext();
    const character = context.characters[context.characterId];
    return character?.name ?? null;
}
