// Educational only. Credits affect fictional ledger only.
const medStorageKey = 'justec-preview-med-v1';
const medCases = new Map();
try {
    const saved = JSON.parse(localStorage.getItem(medStorageKey) || '[]');
    if (Array.isArray(saved)) for (const entry of saved) {
        if (entry && typeof entry.id === 'string' && /^MED-DEMO-\d+$/.test(entry.protocol) && ['fraude','falha'].includes(entry.reason) && ['pending','full','partial','denied'].includes(entry.status) && medEligible(bankState.transactions.find(tx => tx.id === entry.id))) medCases.set(entry.id, entry);
    }
} catch {}
function saveMedCases() {
    try { localStorage.setItem(medStorageKey, JSON.stringify([...medCases.values()])); return true; } catch { return false; }
}
function medRecoveredCents(entry, tx) {
    const cents = pixAmountInCents(-tx.amount);
    return entry.status === 'full' ? cents : entry.status === 'partial' ? Math.floor(cents / 2) : 0;
}
function reconcileMedCredits() {
    bankState.transactions = bankState.transactions.filter(t => !t.id.startsWith('MED-REFUND-'));
    for (const entry of medCases.values()) {
        const tx = bankState.transactions.find(t => t.id === entry.id);
        if (!medEligible(tx)) continue;
        const cents = medRecoveredCents(entry, tx);
        if (!cents) continue;
        bankState.transactions.unshift({id:'MED-REFUND-'+tx.id,date:demoDate(),type:'pix-in',description:'Devolução Pix · MED simulado',amount:cents/100,status:'completed',participant:{name:'Devolução fictícia JUSTEC',institution:'Instituição fictícia JUSTEC'}});
    }
    renderBalance(); renderStatementBalance();
}
let medSelected = null;
function medEligible(tx) { return !!tx && tx.type === 'pix-out' && tx.amount < 0; }
function startMedFromReceipt() {
    if (!medEligible(selectedTransaction)) return;
    medSelected = selectedTransaction;
    closeTransactionDetails();
    navigateTo('reviews');
    document.getElementById('med-form').hidden = false;
    document.getElementById('med-selected').textContent = medSelected.id + ' · ' + formatMoney(-medSelected.amount);
    document.getElementById('med-reason').value = '';
    document.getElementById('med-feedback').textContent = '';
}
function renderMedCases() {
    const list = document.getElementById('med-list');
    list.replaceChildren();
    if (!medCases.size) {
        const empty = document.createElement('p');
        empty.textContent = 'Nenhuma contestação de Pix registrada.';
        list.append(empty);
    }
    for (const entry of medCases.values()) {
        const card = document.createElement('article');
        card.className = 'med-case';
        const p = document.createElement('h4');
        const tx = bankState.transactions.find(t => t.id === entry.id);
        const labels = {pending:'Em análise',full:'Devolução integral',partial:'Devolução parcial',denied:'Negativa'};
        p.textContent = entry.protocol + ' · ' + entry.id + ' · ' + labels[entry.status] + ' (simulação)';
        card.append(p);
        const detail = document.createElement('p');
        detail.textContent = 'Motivo: ' + (entry.reason === 'fraude' ? 'Suspeita de fraude ou golpe' : 'Falha operacional') + (tx ? ' · Pix original: ' + formatMoney(-tx.amount) : '');
        card.append(detail);
        if (entry.status === 'pending') {
            for (const [status,label] of [['full','Simular devolução integral'],['partial','Simular devolução parcial'],['denied','Simular negativa']]) {
                const button = document.createElement('button');
                button.type = 'button'; button.textContent = label;
                button.onclick = () => {
                    if (entry.status !== 'pending') return;
                    entry.status = status;
                    saveMedCases(); reconcileMedCredits(); renderMedCases();
                };
                card.append(button);
            }
        } else if (tx) {
            const result = document.createElement('p');
            result.textContent = 'Valor recuperado no cenário: ' + formatMoney(medRecoveredCents(entry, tx)/100) + '. Crédito exclusivamente fictício.';
            card.append(result);
        }
        list.append(card);
    }
}
document.getElementById('med-form').addEventListener('submit', event => {
    event.preventDefault();
    const feedback = document.getElementById('med-feedback');
    if (!medEligible(medSelected)) return;
    const reason = document.getElementById('med-reason').value;
    if (!['fraude','falha'].includes(reason)) {
        feedback.textContent = 'Engano ou desacordo comercial comum não é hipótese de MED. Procure orientação do banco.';
        return;
    }
    if (medCases.has(medSelected.id)) {
        feedback.textContent = 'Já existe uma contestação simulada para este Pix.';
        return;
    }
    const entry = {id:medSelected.id, protocol:'MED-DEMO-' + String(medCases.size+1).padStart(4,'0'), reason, status:'pending'};
    medCases.set(entry.id,entry);
    const persisted = saveMedCases();
    feedback.textContent = 'Solicitação fictícia registrada: ' + entry.protocol + (persisted ? '' : ' (armazenamento indisponível; apenas nesta sessão)');
    document.getElementById('med-form').hidden = true;
    medSelected = null;
    renderMedCases();
});

reconcileMedCredits();
renderMedCases();
