export function getCurrentCharacterName() {
    const context = SillyTavern.getContext();
    const charName = context.characters[context.characterId]?.name;
    return charName;
}
