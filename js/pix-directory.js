// Catálogo local explícito: nenhuma consulta ao DICT ou criação de titularidade.
const pixDirectory = Object.freeze([
    ['demo-low', 'escola-a@example.invalid'], ['demo-medium', 'escola-b@example.invalid'],
    ['demo-high', 'loja-c@example.invalid'], ['demo-false', 'escola-d@example.invalid']
].map(([id, key]) => Object.freeze({ id, key, institution: 'Instituição fictícia JUSTEC' })));
function lookupPixRecipient({id, key}) {
    const entry = pixDirectory.find(item => key !== undefined ? item.key === key.trim().toLowerCase() : item.id === id);
    const recipient = entry && demoRecipients.find(item => item.id === entry.id);
    return recipient ? { ...recipient, flags: { ...recipient.flags }, institution: entry.institution } : null;
}
