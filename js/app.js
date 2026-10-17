
const bankState = {
    balance: calculateTotals(statementScenario.transactions).net + statementScenario.openingBalance,
    isBalanceVisible: true
};

let currentPixType = 'safe';


function navigateTo(screenId) {
    // Oculta todas as telas
    const screens = ['home', 'pix', 'screening', 'action-post', 'rights', 'edu-center', 'statement'];
    screens.forEach(id => {
        const el = document.getElementById(`screen-${id}`);
        if (el) el.classList.add('hidden');
    });

    document.getElementById('app-content').scrollTop = 0;
    if (screenId === 'statement') renderTransactions();

    // Reseta destaques dos botões do menu inferior
    const navIds = ['home', 'pix', 'screening', 'action', 'rights'];
    navIds.forEach(id => {
        const btn = document.getElementById(`nav-btn-${id}`);
        if (btn) btn.className = "flex flex-col items-center text-slate-500 hover:text-slate-300 transition";
    });

    // Exibe a tela desejada e atualiza botão
    document.getElementById(`screen-${screenId}`).classList.remove('hidden');

    if (screenId === 'home') {
        document.getElementById('nav-btn-home').className = "flex flex-col items-center text-bb-yellow transition";
    } else if (screenId === 'pix') {
        document.getElementById('nav-btn-pix').className = "flex flex-col items-center text-bb-yellow transition";
    } else if (screenId === 'screening') {
        document.getElementById('nav-btn-screening').className = "flex flex-col items-center text-amber-400 transition";
    } else if (screenId === 'action-post') {
        document.getElementById('nav-btn-action').className = "flex flex-col items-center text-rose-400 transition";
    } else if (screenId === 'rights') {
        document.getElementById('nav-btn-rights').className = "flex flex-col items-center text-bb-yellow transition";
    }
}


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


function openPixFlow(type) {
    currentPixType = type;
    navigateTo('pix');

    const btnSafe = document.getElementById('btn-pix-safe');
    const btnSuspect = document.getElementById('btn-pix-suspect');
    const nameEl = document.getElementById('pix-dest-name');
    const docEl = document.getElementById('pix-dest-doc');
    const badgeEl = document.getElementById('pix-status-badge');
    const titleEl = document.getElementById('pix-analysis-title');
    const descEl = document.getElementById('pix-analysis-desc');

    if (type === 'safe') {
        btnSafe.className = "py-2 px-2 text-[10px] font-bold rounded-lg bg-emerald-600 text-white shadow transition flex items-center justify-center gap-1.5";
        btnSuspect.className = "py-2 px-2 text-[10px] font-bold rounded-lg bg-slate-800 text-rose-400 border border-rose-500/40 hover:bg-slate-700 transition flex items-center justify-center gap-1.5";
        
        nameEl.innerText = "Lucas Andrade Ribeiro";
        docEl.innerText = "CPF: ***.842.108-** • Banco Nubank";
        badgeEl.className = "px-2 py-1 rounded text-[9px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
        badgeEl.innerText = "CONTA VERIFICADA";

        titleEl.innerHTML = `<i class="fa-solid fa-shield-check text-emerald-400 mr-1"></i> Análise de Segurança JUSTEC Guard`;
        descEl.innerText = "Cenário fictício de Pix seguro para fins educativos. Nenhum dado bancário ou registro do Banco Central foi consultado.";
    } else {
        btnSafe.className = "py-2 px-2 text-[10px] font-bold rounded-lg bg-slate-800 text-emerald-400 border border-emerald-500/40 hover:bg-slate-700 transition flex items-center justify-center gap-1.5";
        btnSuspect.className = "py-2 px-2 text-[10px] font-bold rounded-lg bg-rose-600 text-white shadow transition flex items-center justify-center gap-1.5";
        
        nameEl.innerText = "Central Receptora Vendas Ltda";
        docEl.innerText = "CNPJ: **.912.001/0001-** • Banco Laranja";
        badgeEl.className = "px-2 py-1 rounded text-[9px] font-extrabold bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse";
        badgeEl.innerText = "ALERTA MÁXIMO DE GOLPE";

        titleEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-rose-400 mr-1"></i> ALERTA PREVENTIVO DE FRAUDE`;
        descEl.innerText = "Cenário fictício com sinais de golpe para fins educativos. Nenhuma denúncia real foi consultada. Em uma situação semelhante, pare e confirme pelos canais oficiais.";
    }
}

function changePixValue() {
    const val = prompt("Digite o novo valor do Pix (R$):", "350,00");
    if (val) {
        document.getElementById('pix-val-display').innerText = val;
    }
}

// Função de Validação por Impressão Digital
function startBiometricVerification() {
    const modal = document.getElementById('app-modal');
    const modalBox = document.getElementById('modal-box');
    const iconContainer = document.getElementById('modal-icon-container');
    const icon = document.getElementById('modal-icon');
    const badge = document.getElementById('modal-badge');
    const title = document.getElementById('modal-title');
    const desc = document.getElementById('modal-desc');

    modalBox.className = "w-full max-w-sm rounded-3xl p-5 text-white shadow-2xl text-center border border-bb-yellow bg-slate-900 glow-yellow";
    iconContainer.className = "w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-3 text-3xl shadow-xl bg-bb-yellow text-slate-950 biometric-ring cursor-pointer";
    icon.className = "fa-solid fa-fingerprint";
    badge.className = "text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full mb-2 inline-block bg-amber-500/20 text-bb-yellow border border-amber-500/40";
    badge.innerText = "CONFIRMAÇÃO BIOMÉTRICA DIGITAL";
    title.innerText = "Toque no Leitor Digital";
    desc.innerHTML = `
        <div class="text-center space-y-2 py-2">
            <p class="text-slate-200 text-xs font-bold">Coloque o seu polegar no leitor digital para autenticar a transação.</p>
            <p class="text-[10px] text-amber-300">A validação biométrica garante a irretratabilidade e protege sua transferência com o protocolo de segurança JUSTEC.</p>
        </div>
    `;

    // Adiciona listener temporário para simular leitura de digital
    iconContainer.onclick = function() {
        confirmBiometricSuccess();
    };

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function confirmBiometricSuccess() {
    const iconContainer = document.getElementById('modal-icon-container');
    const icon = document.getElementById('modal-icon');
    const title = document.getElementById('modal-title');
    const desc = document.getElementById('modal-desc');
    const badge = document.getElementById('modal-badge');

    if (currentPixType === 'safe') {
        iconContainer.className = "w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-3 text-3xl shadow-xl bg-emerald-500 text-slate-950";
        icon.className = "fa-solid fa-circle-check";
        badge.innerText = "AUTENTICADO COM SUCESSO";
        badge.className = "text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full mb-2 inline-block bg-emerald-500/20 text-emerald-400 border border-emerald-500/40";
        title.innerText = "Pix Realizado com Segurança!";
        desc.innerHTML = `
            <p class="text-emerald-300 font-bold text-center"><i class="fa-solid fa-check-double mr-1"></i> Impressão Digital Confirmada!</p>
            <p class="text-[11px] text-slate-300">Sua transferência foi efetuada e resguardada com o selo de proteção do consumidor JUSTEC Bank.</p>
        `;
    } else {
        iconContainer.className = "w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-3 text-3xl shadow-xl bg-rose-600 text-white animate-pulse";
        icon.className = "fa-solid fa-shield-xmark";
        badge.innerText = "BLOQUEIO PREVENTIVO ATIVADO";
        badge.className = "text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full mb-2 inline-block bg-rose-900 text-rose-200 border border-rose-600";
        title.innerText = "Transferência Retida!";
        desc.innerHTML = `
            <p class="text-rose-300 font-bold"><i class="fa-solid fa-triangle-exclamation mr-1"></i> Ação Interrompida!</p>
            <p class="text-[11px] text-slate-300">A leitura digital detectou um alerta de golpe ativo para esta conta de destino. Seus recursos foram mantidos em segurança na sua conta.</p>
        `;
    }

    iconContainer.onclick = null;
}

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
    return statementScenario.transactions.filter(item => {
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
    const item = statementScenario.transactions.find(transaction => transaction.id === id);
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
