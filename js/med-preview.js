// Educational only. No real bank communication or balance changes.
const medCases = new Map();
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
        p.textContent = entry.protocol + ' · ' + entry.id + ' · Em análise (simulação)';
        list.append(p);
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
    const entry = {id:medSelected.id, protocol:'MED-DEMO-' + String(medCases.size+1).padStart(4,'0'), reason};
    medCases.set(entry.id,entry);
    feedback.textContent = 'Solicitação fictícia registrada: ' + entry.protocol;
    document.getElementById('med-form').hidden = true;
    medSelected = null;
    renderMedCases();
});
