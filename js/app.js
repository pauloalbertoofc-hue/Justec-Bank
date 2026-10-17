
const bankState = {
    balance: 2480.50,
    isBalanceVisible: true
};

let currentPixType = 'safe';


function navigateTo(screenId) {
    // Oculta todas as telas
    const screens = ['home', 'pix', 'screening', 'action-post', 'rights', 'edu-center'];
    screens.forEach(id => {
        const el = document.getElementById(`screen-${id}`);
        if (el) el.classList.add('hidden');
    });

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
            bankState.balance.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL"
            });

        eyeIcon.className = "fa-solid fa-eye";
    } else {
        balanceDisplay.textContent = "R$ ••••••";
        eyeIcon.className = "fa-solid fa-eye-slash";
    }
}

function toggleBalance() {
    bankState.isBalanceVisible = !bankState.isBalanceVisible;
    renderBalance();
}

renderBalance();


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
        descEl.innerText = "Chave Pix frequente. Sem registros de contestação ou comportamentos suspeitos registrados no Banco Central.";
    } else {
        btnSafe.className = "py-2 px-2 text-[10px] font-bold rounded-lg bg-slate-800 text-emerald-400 border border-emerald-500/40 hover:bg-slate-700 transition flex items-center justify-center gap-1.5";
        btnSuspect.className = "py-2 px-2 text-[10px] font-bold rounded-lg bg-rose-600 text-white shadow transition flex items-center justify-center gap-1.5";
        
        nameEl.innerText = "Central Receptora Vendas Ltda";
        docEl.innerText = "CNPJ: **.912.001/0001-** • Banco Laranja";
        badgeEl.className = "px-2 py-1 rounded text-[9px] font-extrabold bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse";
        badgeEl.innerText = "ALERTA MÁXIMO DE GOLPE";

        titleEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-rose-400 mr-1"></i> ALERTA PREVENTIVO DE FRAUDE`;
        descEl.innerText = "Esta chave foi criada recentemente e tem denúncias de estelionato ativas. Recomendamos NÃO realizar esta transferência!";
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