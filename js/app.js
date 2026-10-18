
function navigateTo(screenId) {
    // Oculta todas as telas
    const screens = ['home', 'pix', 'screening', 'action-post', 'rights', 'edu-center', 'statement', 'protection', 'reviews', 'security'];
    screens.forEach(id => {
        const el = document.getElementById(`screen-${id}`);
        if (el) el.classList.add('hidden');
    });

    if (screenId === 'statement') renderTransactions();
    if (['protection', 'reviews', 'security'].includes(screenId)) renderProtection();

    document.getElementById(`screen-${screenId}`).classList.remove('hidden');
    syncNavigation(screenId);
    window.scrollTo(0, 0);
}

function syncNavigation(screenId) {
    const mobileParents = { statement: 'home', protection: 'screening', reviews: 'screening', security: 'screening', 'edu-center': 'screening' };
    document.querySelectorAll('[data-nav-screen]').forEach(button => {
        const isMobile = button.closest('[data-nav-variant]').dataset.navVariant === 'mobile';
        const active = button.dataset.navScreen === (isMobile ? mobileParents[screenId] || screenId : screenId);
        if (active) button.setAttribute('aria-current', 'page');
        else button.removeAttribute('aria-current');
    });
}
syncNavigation('home');


function renderBalance() {
    const balanceDisplay = document.getElementById("balance-display");
    const eyeIcon = document.getElementById("eye-icon");
    const balanceToggle = document.getElementById("balance-toggle");

    if (!balanceDisplay || !eyeIcon) {
        return;
    }

    if (balanceToggle) {
        balanceToggle.setAttribute("aria-label",
            bankState.isBalanceVisible ? "Ocultar saldo" : "Exibir saldo");
    }

    if (bankState.isBalanceVisible) {
        balanceDisplay.textContent =
            formatMoney(bankState.balance);

        eyeIcon.className = "fa-solid fa-eye";
    } else {
        balanceDisplay.textContent = "R$ ••••••";
        eyeIcon.className = "fa-solid fa-eye-slash";
    }
}

function toggleBalance() {
    bankState.isBalanceVisible = !bankState.isBalanceVisible;
    renderBalance();
    renderStatementBalance();
}

renderBalance();
renderStatementBalance();


function showDiagnosis(type) {
    const modal = document.getElementById('app-modal');
    const modalBox = document.getElementById('modal-box');
    const iconContainer = document.getElementById('modal-icon-container');
    const icon = document.getElementById('modal-icon');
    const badge = document.getElementById('modal-badge');
    const title = document.getElementById('modal-title');
    const desc = document.getElementById('modal-desc');

    if (type === 'bank_call') {
        modalBox.className = "w-full max-w-sm rounded-3xl p-5 text-white shadow-2xl text-center border border-rose-500/60 bg-slate-900 glow-rose";
        iconContainer.className = "w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-3 text-2xl shadow-xl bg-rose-600 text-white";
        icon.className = "fa-solid fa-phone-slash";
        badge.className = "text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full mb-2 inline-block bg-rose-900 text-rose-200 border border-rose-600";
        badge.innerText = "ALERTA VERMELHO • É GOLPE!";
        title.innerText = "Falsa Central do Banco";
        desc.innerHTML = `
            <p class="text-rose-300 font-bold"><i class="fa-solid fa-hand mr-1"></i> Desligue a ligação agora mesmo!</p>
            <p>O JUSTEC Bank e demais bancos <strong>NUNCA</strong> ligam pedindo senhas, códigos digitados/tokens ou transferências de teste para cancelar compras suspeitas.</p>
        `;
    } else if (type === 'whatsapp') {
        modalBox.className = "w-full max-w-sm rounded-3xl p-5 text-white shadow-2xl text-center border border-amber-500/60 bg-slate-900 glow-yellow";
        iconContainer.className = "w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-3 text-2xl shadow-xl bg-bb-yellow text-slate-950";
        icon.className = "fa-brands fa-whatsapp";
        badge.className = "text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full mb-2 inline-block bg-amber-500/20 text-bb-yellow border border-amber-500/40";
        badge.innerText = "ALERTA AMARELO • PARE E VERIFIQUE";
        title.innerText = "Golpe do Falso Parente";
        desc.innerHTML = `
            <p class="text-amber-300 font-bold"><i class="fa-solid fa-circle-exclamation mr-1"></i> Não faça o Pix antes de ligar!</p>
            <p>Ligue diretamente para o <strong>número antigo e oficial</strong> do seu familiar. Golpistas pegam fotos da rede social para se passar por parentes trocando de número.</p>
        `;
    } else if (type === 'offer') {
        modalBox.className = "w-full max-w-sm rounded-3xl p-5 text-white shadow-2xl text-center border border-amber-500/60 bg-slate-900 glow-yellow";
        iconContainer.className = "w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-3 text-2xl shadow-xl bg-bb-yellow text-slate-950";
        icon.className = "fa-solid fa-store";
        badge.className = "text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full mb-2 inline-block bg-amber-500/20 text-bb-yellow border border-amber-500/40";
        badge.innerText = "ALERTA AMARELO • PERIGO DE SITE FALSO";
        title.innerText = "Oferta Suspeita em Rede Social";
        desc.innerHTML = `
            <p class="text-amber-300 font-bold"><i class="fa-solid fa-magnifying-glass mr-1"></i> Confira o CNPJ e a conta!</p>
            <p>Nunca faça Pix para chave de Pessoa Física (CPF) ao comprar em lojas ou sites comerciais.</p>
        `;
    }

    iconContainer.onclick = null;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function openMedWizard() {
    const modal = document.getElementById('app-modal');
    const modalBox = document.getElementById('modal-box');
    const iconContainer = document.getElementById('modal-icon-container');
    const icon = document.getElementById('modal-icon');
    const badge = document.getElementById('modal-badge');
    const title = document.getElementById('modal-title');
    const desc = document.getElementById('modal-desc');

    modalBox.className = "w-full max-w-sm rounded-3xl p-5 text-white shadow-2xl text-center border border-blue-500/60 bg-slate-900";
    iconContainer.className = "w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-3 text-2xl shadow-xl bg-blue-600 text-white";
    icon.className = "fa-solid fa-file-signature";
    badge.className = "text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full mb-2 inline-block bg-blue-900 text-blue-200 border border-blue-600";
    badge.innerText = "ROTEIRO PRÁTICO • SOLICITAÇÃO MED";
    title.innerText = "Roteiro de Texto para o Banco";
    desc.innerHTML = `
        <p class="text-blue-300 font-bold text-xs"><i class="fa-solid fa-copy mr-1"></i> Copie e envie para o chat do seu banco:</p>
        <div class="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[10px] text-slate-300 select-all">
            "Solicito a abertura imediata do procedimento do MED (Mecanismo Especial de Devolução - Resolução BCB nº 103/2021) para o Pix realizado sob fraude e estelionato."
        </div>
        <p class="text-slate-400 text-[10px]">Exija e anote o número do protocolo do atendimento.</p>
    `;

    iconContainer.onclick = null;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeAppModal() {
    const modal = document.getElementById('app-modal');
    modal.classList.remove('flex');
    modal.classList.add('hidden');
}
// Extrato exclusivamente demonstrativo. Centavos inteiros evitam erros de soma.
function formatMoney(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function calculateTotals(transactions) {
    const totals = transactions.reduce((sum, item) => {
        const cents = Math.round(item.amount * 100);
        if (cents > 0) sum.incoming += cents;
        else sum.outgoing -= cents;
        return sum;
    }, { incoming: 0, outgoing: 0 });
    return { incoming: totals.incoming / 100, outgoing: totals.outgoing / 100,
        net: (totals.incoming - totals.outgoing) / 100 };
}

function filterTransactions(period, type) {
    const end = Date.parse(`${statementScenario.referenceDate}T23:59:59.999-03:00`);
    const start = Date.parse(`${statementScenario.referenceDate}T00:00:00-03:00`) - (Number(period) - 1) * 86400000;
    return bankState.transactions.filter(item => {
        const date = Date.parse(item.date);
        return date >= start && date <= end &&
            (type === 'all' || (type === 'incoming' && item.amount > 0) || (type === 'outgoing' && item.amount < 0));
    }).sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

function transactionDate(value) {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(value));
}

function transactionStatus(status) {
    return { completed: 'Concluída', review: 'Em análise', suspicious: 'Sinalizada como suspeita' }[status];
}

function renderStatementBalance() {
    const el = document.getElementById('statement-balance');
    if (!el) return;
    el.textContent = bankState.isBalanceVisible ? formatMoney(bankState.balance) : 'R$ ••••••';
    document.getElementById('statement-eye').className = bankState.isBalanceVisible ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash';
    document.getElementById('statement-balance-toggle').setAttribute('aria-label', bankState.isBalanceVisible ? 'Ocultar saldo' : 'Exibir saldo');
}

function renderTransactions() {
    const items = filterTransactions(document.getElementById('statement-period').value, document.getElementById('statement-type').value);
    const totals = calculateTotals(items);
    renderStatementBalance();
    document.getElementById('statement-incoming').textContent = formatMoney(totals.incoming);
    document.getElementById('statement-outgoing').textContent = formatMoney(totals.outgoing);
    document.getElementById('statement-opening').textContent = formatMoney(statementScenario.openingBalance);
    document.getElementById('statement-count').textContent = `${items.length} movimentações fictícias no filtro`;
    const list = document.getElementById('statement-list');
    list.replaceChildren();
    if (!items.length) list.textContent = 'Nenhuma movimentação neste filtro.';
    items.forEach(item => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `transaction-item ${item.amount > 0 ? 'incoming' : 'outgoing'}`;
        const heading = document.createElement('strong');
        heading.textContent = `${item.amount > 0 ? '↓ Entrada' : '↑ Saída'} · ${item.description}`;
        const participant = document.createElement('span');
        participant.textContent = item.participant.name;
        const value = document.createElement('b');
        value.textContent = formatMoney(item.amount);
        const date = document.createElement('small');
        date.textContent = transactionDate(item.date);
        const status = document.createElement('small');
        status.className = `transaction-status ${item.status}`;
        status.textContent = `${item.status === 'suspicious' ? '⚠ ' : ''}${transactionStatus(item.status)} · Simulação`;
        button.append(heading, value, participant, date, status);
        button.addEventListener('click', () => showTransactionDetails(item.id));
        list.append(button);
    });
}

let selectedTransaction = null;
let receiptReturnFocus = null;
function showTransactionDetails(id) {
    const item = bankState.transactions.find(transaction => transaction.id === id);
    if (!item) return;
    selectedTransaction = item;
    receiptReturnFocus = document.activeElement;
    const details = document.getElementById('receipt-details');
    details.replaceChildren();
    for (const [label, value] of [
        ['Identificador fictício', item.id], ['Data e horário', transactionDate(item.date)],
        ['Operação', item.description], ['Participante fictício', item.participant.name],
        ['Instituição fictícia', item.participant.institution], ['Valor', formatMoney(item.amount)],
        ['Status simulado', transactionStatus(item.status)]
    ]) {
        const line = document.createElement('p'); line.textContent = `${label}: ${value}`; details.append(line);
    }
    document.getElementById('receipt-feedback').textContent = '';
    document.getElementById('receipt-dispute').hidden = item.amount > 0;
    document.getElementById('receipt-education').hidden = true;
    document.getElementById('receipt-alert').hidden = item.status !== 'suspicious';
    document.getElementById('statement-dialog').showModal();
}

function closeTransactionDetails() {
    document.getElementById('statement-dialog').close();
    receiptReturnFocus?.focus();
}

function navigateFromReceipt(screen) {
    closeTransactionDetails();
    navigateTo(screen);
}

function showDisputeEducation() {
    if (!selectedTransaction || selectedTransaction.amount >= 0) return;
    document.getElementById('receipt-education').hidden = false;
}

async function copyReceipt() {
    const item = selectedTransaction;
    if (!item) return;
    const text = `SIMULAÇÃO EDUCACIONAL — SEM VALIDADE BANCÁRIA\nJUSTEC Bank — Comprovante demonstrativo\n${item.id}\n${transactionDate(item.date)}\n${item.description}\nParticipante fictício: ${item.participant.name}\n${formatMoney(item.amount)}\nStatus simulado: ${transactionStatus(item.status)}\nNenhuma operação bancária real foi realizada.`;
    try {
        await navigator.clipboard.writeText(text);
        document.getElementById('receipt-feedback').textContent = 'Comprovante simulado copiado. Sem validade bancária.';
    } catch {
        document.getElementById('receipt-feedback').textContent = 'Não foi possível copiar. Permita acesso à área de transferência ou selecione os dados manualmente. Simulação sem validade bancária.';
    }
}
