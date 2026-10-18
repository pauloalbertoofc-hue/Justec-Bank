// Regras acadêmicas configuráveis; nenhuma consulta externa ou inferência sobre pessoas reais.
const riskRules = { newKey: 20, unfamiliar: 15, outlier: 25, behaviorChange: 20, internalAlert: 40, repeated: 15, moderate: 30, high: 60 };
const demoRecipients = [
    { id: 'demo-low', name: 'Destinatário Escola A (fictício)', maskedKey: '***.000.***-**', flags: {} },
    { id: 'demo-medium', name: 'Destinatário Escola B (fictício)', maskedKey: 'es***@example.invalid', flags: { newKey: true, unfamiliar: true } },
    { id: 'demo-high', name: 'Loja Escola C (fictícia)', maskedKey: '**.000.***/0001-**', flags: { newKey: true, unfamiliar: true, internalAlert: true }, falsePositive: false },
    { id: 'demo-false', name: 'Destinatário Escola D (falso positivo)', maskedKey: '+55 ** *****-0000', flags: { newKey: true, internalAlert: true }, falsePositive: true }
];
function evaluateRisk(recipient, amount, state = bankState) {
    const release = state.restrictions.some(r => r.recipientId === recipient.id && r.status === 'Restrição retirada');
    const flags = release ? {} : recipient.flags;
    const indicators = [
        [flags.newKey, 'newKey', 'Chave recém-cadastrada no cenário'],
        [flags.unfamiliar, 'unfamiliar', 'Destinatário não habitual no cenário'],
        [amount > 1000, 'outlier', 'Valor acima do padrão fictício de R$ 1.000,00'],
        [flags.behaviorChange, 'behaviorChange', 'Alteração fictícia de comportamento'],
        [flags.internalAlert, 'internalAlert', 'Alerta interno fictício'],
        [!release && state.attempts.filter(a => a.recipientId === recipient.id).length >= 2, 'repeated', 'Duas ou mais tentativas interrompidas no cenário']
    ].filter(([active]) => active);
    const score = indicators.reduce((sum, [, key]) => sum + riskRules[key], 0);
    const restricted = state.restrictions.some(r => r.recipientId === recipient.id && r.status !== 'Restrição retirada');
    return { score, level: restricted || score >= riskRules.high ? 'elevated' : score >= riskRules.moderate ? 'moderate' : 'low', reasons: [...indicators.map(([, , text]) => text), ...(restricted ? ['Política interna simulada: restrição ainda ativa'] : [])] };
}
for (const recipient of demoRecipients.filter(r => r.id === 'demo-high' || r.falsePositive)) {
    bankState.restrictions.push({ id: demoId('REV'), recipientId: recipient.id, status: 'Restrição ativa', date: demoDate(), reasons: ['Alerta fictício de cadastro recente e sinalização interna'], reason: '', history: ['Restrição ativa'], falsePositive: !!recipient.falsePositive });
}
