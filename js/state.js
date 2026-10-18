// Estado único da demonstração, reiniciado a cada recarga. Nenhum armazenamento local.
const bankState = {
    isBalanceVisible: true,
    transactions: statementScenario.transactions,
    openingBalance: statementScenario.openingBalance,
    attempts: [], restrictions: [], sequence: 0,
    get balance() {
        return (Math.round(this.openingBalance * 100) + this.transactions.reduce((sum, tx) => sum + Math.round(tx.amount * 100), 0)) / 100;
    }
};
function demoId(prefix) { return `${prefix}-${++bankState.sequence}`; }
function demoDate() { return `${statementScenario.referenceDate}T12:00:00-03:00`; }
function recordApprovedPix(draft) {
    if (bankState.transactions.some(tx => tx.id === draft.id)) return draft.id;
    if (draft.amount <= 0 || draft.amount > bankState.balance) throw new Error('Saldo insuficiente para a simulação.');
    bankState.transactions.unshift({ id: draft.id, date: demoDate(), type: 'pix-out', description: 'Pix enviado · simulação', amount: -draft.amount, status: 'completed', participant: { name: draft.recipient.name, institution: 'Instituição fictícia JUSTEC' } });
    return draft.id;
}
function recordInterruptedPix(draft, risk) {
    if (!bankState.attempts.some(item => item.id === draft.id)) bankState.attempts.unshift({ id: draft.id, recipientId: draft.recipient.id, date: demoDate(), amount: draft.amount, reasons: [...risk.reasons] });
    if (!bankState.restrictions.some(item => item.recipientId === draft.recipient.id && item.status !== 'Restrição retirada')) bankState.restrictions.push({ id: demoId('REV'), recipientId: draft.recipient.id, status: 'Restrição ativa', reasons: [...risk.reasons], date: demoDate(), reason: '', history: ['Restrição ativa'], falsePositive: draft.recipient.falsePositive === true });
}
