let pixDraft = null;
let pixPreparation = 0;
function pixMessage(message) { document.getElementById('pix-feedback').textContent = message; }
function resetPixSteps() {
    pixPreparation++;
    pixDraft = null;
    for (const id of ['pix-confirm', 'pix-guard', 'pix-auth', 'pix-result']) document.getElementById(id).hidden = true;
    for (const id of ['pix-data-confirm', 'pix-extra', 'pix-demo-confirm']) document.getElementById(id).checked = false;
    document.getElementById('pix-submit').disabled = false;
    pixMessage('');
}
function openPixFlow(type) {
    resetPixSteps();
    document.getElementById('pix-form').reset();
    document.getElementById('pix-recipient').value = type === 'suspicious' ? 'demo-high' : 'demo-low';
    updatePixRecipient();
    navigateTo('pix');
}
function updatePixRecipient() {
    document.getElementById('pix-custom').hidden = document.getElementById('pix-recipient').value !== 'custom';
    resetPixSteps();
}
function parsePixAmount(value) {
    // Aceita 1234,56 ou 1.234,56; rejeita negativos, exponentes e casas extras.
    if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(value.trim())) return NaN;
    return Math.round(Number(value.trim().replaceAll('.', '').replace(',', '.')) * 100) / 100;
}
function formatPixAmount() {
    const input = document.getElementById('pix-amount');
    const amount = parsePixAmount(input.value);
    if (Number.isFinite(amount)) input.value = amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function isDemoKey(key) {
    return /^(?:\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2}|\d{14}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\+\d{10,15}|[^\s@]+@[^\s@]+\.[^\s@]+|[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12})$/i.test(key);
}
async function preparePix(event) {
    event.preventDefault();
    resetPixSteps();
    const preparation = pixPreparation;
    const amount = parsePixAmount(document.getElementById('pix-amount').value);
    if (!Number.isFinite(amount) || amount <= 0) return pixMessage('Informe um valor positivo no formato 50,00.');
    if (amount > 2000) return pixMessage('Limite demonstrativo: R$ 2.000,00 por operação.');
    if (amount > bankState.balance) return pixMessage('Saldo fictício insuficiente.');
    let recipient = demoRecipients.find(r => r.id === document.getElementById('pix-recipient').value);
    if (!recipient) {
        const key = document.getElementById('pix-key').value.trim();
        if (!isDemoKey(key)) return pixMessage('Formato de chave ilustrativa inválido. Use apenas dados fictícios.');
        const scenario = document.getElementById('pix-scenario').value;
        // Impressão local de dados fictícios: a chave completa não é retida.
        if (!globalThis.crypto?.subtle) return pixMessage('Para digitar uma chave fictícia, abra em HTTPS ou localhost. Você também pode selecionar um destinatário de demonstração.');
        const normalized = key.includes('@') ? key.toLowerCase() : /^[\d.+/\-]+$/.test(key) ? key.replace(/\D/g, '') : key.toLowerCase();
        let fingerprint;
        try {
            const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
            fingerprint = Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
        } catch { return pixMessage('Não foi possível identificar a chave fictícia localmente. Selecione um destinatário da lista.'); }
        if (preparation !== pixPreparation) return;
        const flags = scenario === 'low' ? {} : scenario === 'moderate' ? { newKey: true, unfamiliar: true } : { newKey: true, internalAlert: true, behaviorChange: true };
        recipient = demoRecipients.find(item => item.keyFingerprint === fingerprint);
        if (recipient) recipient.flags = flags;
        else {
            recipient = { id: demoId('CUSTOM'), name: 'Destinatário informado (fictício)', maskedKey: `${key.slice(0, 2)}***${key.slice(-2)}`, keyFingerprint: fingerprint, flags };
            demoRecipients.push(recipient);
        }
    }
    pixDraft = { id: demoId('PIX'), recipient, amount, stage: 'confirmation' };
    document.getElementById('pix-summary').textContent = `${recipient.name} · Instituição fictícia JUSTEC · Chave ${recipient.maskedKey} · ${formatMoney(amount)}`;
    document.getElementById('pix-confirm').hidden = false;
    pixMessage('Confira o destinatário e o valor. Nenhum dado bancário foi consultado.');
}
async function analyzePix() {
    const draft = pixDraft;
    if (!draft || draft.stage !== 'confirmation') return;
    if (!document.getElementById('pix-data-confirm').checked) return pixMessage('Confirme explicitamente os dados fictícios.');
    draft.stage = 'loading';
    pixMessage('Analisando regras demonstrativas…');
    document.getElementById('pix-confirm').setAttribute('aria-busy', 'true');
    await new Promise(resolve => setTimeout(resolve, 180));
    document.getElementById('pix-confirm').removeAttribute('aria-busy');
    if (pixDraft !== draft) return;
    const risk = evaluateRisk(draft.recipient, draft.amount);
    draft.risk = risk;
    document.getElementById('pix-guard').hidden = false;
    document.getElementById('pix-risk').textContent = `${{low:'Baixo risco', moderate:'Risco moderado', elevated:'Risco elevado'}[risk.level]} · ${risk.score} pontos. ${risk.reasons.join('; ') || 'Sem indicadores no cenário.'} Nenhum indicador prova fraude; nenhuma consulta externa foi feita.`;
    document.getElementById('pix-extra-label').hidden = risk.level !== 'moderate';
    document.getElementById('pix-continue').hidden = risk.level === 'elevated';
    if (risk.level === 'elevated') return interruptPix(draft, risk);
    draft.stage = 'analyzed';
    pixMessage(risk.level === 'moderate' ? 'Alerta preventivo. É necessária uma confirmação adicional.' : 'Análise demonstrativa concluída.');
}
function interruptPix(draft, risk) {
    draft.stage = 'interrupted';
    recordInterruptedPix(draft, risk);
    document.getElementById('pix-auth').hidden = true;
    document.getElementById('pix-result').hidden = false;
    document.getElementById('pix-result-text').textContent = `Operação fictícia interrompida, sem desconto do saldo. Motivos: ${risk.reasons.join('; ')}. Restrição interna simulada, sem bloqueio no DICT.`;
    document.getElementById('pix-review').hidden = false;
    document.getElementById('pix-receipt').hidden = true;
    pixMessage('Tentativa registrada somente no histórico de interrupções.');
}
function showDemoAuthentication() {
    if (!pixDraft || pixDraft.stage !== 'analyzed') return;
    if (pixDraft.risk.level === 'moderate' && !document.getElementById('pix-extra').checked) return pixMessage('Confirme que entendeu o alerta para prosseguir.');
    pixDraft.stage = 'authentication';
    document.getElementById('pix-auth').hidden = false;
    pixMessage('Confirme apenas a simulação. Não há coleta de senha ou biometria.');
}
function completePix() {
    const draft = pixDraft;
    if (!draft || draft.stage !== 'authentication') return;
    if (!document.getElementById('pix-demo-confirm').checked) return pixMessage('Confirme a operação fictícia para continuar.');
    const risk = evaluateRisk(draft.recipient, draft.amount);
    if (risk.level === 'elevated') return interruptPix(draft, risk);
    if (risk.level === 'moderate' && !document.getElementById('pix-extra').checked) return pixMessage('Confirmação adicional necessária.');
    try { recordApprovedPix(draft); } catch (error) { return pixMessage(error.message); }
    draft.stage = 'completed';
    document.getElementById('pix-submit').disabled = true;
    renderBalance(); renderStatementBalance();
    document.getElementById('pix-result').hidden = false;
    document.getElementById('pix-result-text').textContent = `Pix fictício de ${formatMoney(draft.amount)} registrado. Nenhum dinheiro real foi movimentado.`;
    document.getElementById('pix-receipt').hidden = false;
    document.getElementById('pix-review').hidden = true;
    pixMessage('Simulação concluída. Saldo e extrato atualizados uma única vez.');
}
function openPixReceipt() {
    if (!pixDraft || pixDraft.stage !== 'completed') return;
    navigateTo('statement');
    showTransactionDetails(pixDraft.id);
}
function demoElement(tag, text, parent, className = '') {
    const el = document.createElement(tag); el.textContent = text; el.className = className; parent.append(el); return el;
}
function demoButton(text, parent, action) {
    const button = demoElement('button', text, parent); button.type = 'button'; button.addEventListener('click', action); return button;
}
function renderProtection() {
    const list = document.getElementById('protection-list'); list.replaceChildren();
    demoRecipients.forEach(recipient => {
        const risk = evaluateRisk(recipient, 50);
        const restriction = bankState.restrictions.filter(r => r.recipientId === recipient.id).at(-1);
        const card = demoElement('article', '', list, 'demo-panel');
        demoElement('h3', recipient.name, card);
        demoElement('p', `Chave ${recipient.maskedKey} · ${ {low:'Baixo risco',moderate:'Risco moderado',elevated:'Risco elevado'}[risk.level]}`, card);
        demoElement('p', `Análise fictícia: ${transactionDate(demoDate())}. Status: ${restriction?.status || 'Sem restrição interna'}`, card);
        demoElement('p', risk.reasons.join('; ') || 'Sem indicadores fictícios ativos.', card);
        demoButton('Consultar revisões', card, () => navigateTo('reviews'));
    });
    const reviews = document.getElementById('review-list'); reviews.replaceChildren();
    if (!bankState.restrictions.length) demoElement('p', 'Nenhuma restrição simulada.', reviews);
    bankState.restrictions.forEach(restriction => {
        const recipient = demoRecipients.find(r => r.id === restriction.recipientId);
        const card = demoElement('article', '', reviews, 'demo-panel'); card.dataset.reviewId = restriction.id;
        demoElement('h3', `${recipient.name} · ${recipient.maskedKey}`, card);
        demoElement('p', restriction.reasons.join('; '), card);
        demoElement('p', `Status: ${restriction.status}`, card);
        demoElement('p', `Histórico: ${restriction.history.join(' → ')}`, card);
        if (restriction.reason) demoElement('p', `Motivo informado: ${restriction.reason}`, card);
        demoElement('p', `Resultado previsto do cenário: ${restriction.falsePositive ? 'falso positivo, retirada interna' : 'manutenção da restrição interna'}. Não há decisão bancária real.`, card);
        if (['Restrição ativa', 'Restrição mantida'].includes(restriction.status)) {
            const label = demoElement('label', 'Motivo fictício da revisão (10 a 500 caracteres; sem dados reais)', card);
            const input = demoElement('textarea', '', label); input.maxLength = 500; input.value = restriction.reason;
            demoButton('Solicitar revisão simulada', card, () => requestReview(restriction.id, input.value));
        } else if (restriction.status === 'Revisão solicitada') {
            demoButton('Simular início da análise', card, () => advanceReview(restriction.id));
        } else if (restriction.status === 'Em análise') {
            demoButton('Exibir resultado demonstrativo', card, () => advanceReview(restriction.id));
        } else demoElement('p', 'Retirada interna não altera registros oficiais nem desbloqueia uma conta real.', card);
    });
    const attempts = document.getElementById('attempt-list'); attempts.replaceChildren();
    if (!bankState.attempts.length) demoElement('p', 'Nenhuma tentativa interrompida.', attempts);
    bankState.attempts.forEach(item => demoElement('p', `${item.id} · ${transactionDate(item.date)} · ${formatMoney(item.amount)} · ${demoRecipients.find(r => r.id === item.recipientId).name} · ${item.reasons.join('; ')}`, attempts));
}
function requestReview(id, reason) {
    const restriction = bankState.restrictions.find(r => r.id === id);
    if (!restriction || !['Restrição ativa', 'Restrição mantida'].includes(restriction.status)) return;
    const feedback = document.getElementById('review-feedback');
    if (reason.trim().length < 10 || reason.trim().length > 500) { feedback.textContent = 'Informe um motivo fictício de 10 a 500 caracteres.'; return; }
    restriction.reason = reason.trim(); restriction.status = 'Revisão solicitada'; restriction.history.push(restriction.status);
    feedback.textContent = 'Revisão simulada solicitada. Nenhum pedido foi enviado a um banco.';
    renderProtection();
}
function advanceReview(id) {
    const restriction = bankState.restrictions.find(r => r.id === id);
    if (!restriction) return;
    if (restriction.status === 'Revisão solicitada') restriction.status = 'Em análise';
    else if (restriction.status === 'Em análise') restriction.status = restriction.falsePositive ? 'Restrição retirada' : 'Restrição mantida';
    else return;
    restriction.history.push(restriction.status);
    document.getElementById('review-feedback').textContent = `${restriction.status} — resultado educativo, sem efeito no sistema Pix real.`;
    renderProtection();
}
document.getElementById('pix-form').addEventListener('input', resetPixSteps);
