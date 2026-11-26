// Educational only. No real bank communication or balance changes.
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
    for (const entry of medCases.values()) {
        const p = document.createElement('p');
        const tx = bankState.transactions.find(t => t.id === entry.id);
        const labels = {pending:'Em análise',full:'Devolução integral',partial:'Devolução parcial',denied:'Negativa'};
        p.textContent = entry.protocol + ' · ' + entry.id + ' · ' + labels[entry.status] + ' (simulação)';
        list.append(p);
        if (entry.status === 'pending') {
            for (const [status,label] of [['full','Simular devolução integral'],['partial','Simular devolução parcial'],['denied','Simular negativa']]) {
                const button = document.createElement('button');
                button.type = 'button'; button.textContent = label;
                button.onclick = () => {
                    if (entry.status !== 'pending') return;
                    entry.status = status;
                    saveMedCases(); renderMedCases();
                };
                list.append(button);
            }
        } else if (tx) {
            const result = document.createElement('p');
            const cents = Math.round(-tx.amount * 100);
            result.textContent = 'Valor recuperado no cenário: ' + formatMoney((entry.status === 'full' ? cents : entry.status === 'partial' ? Math.floor(cents / 2) : 0)/100) + '. Resultado ilustrativo; não altera o saldo.';
            list.append(result);
        }
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

renderMedCases();
