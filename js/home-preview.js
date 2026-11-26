// Preview-only presentation; never mutates banking state.
function renderHomeRecent() {
    const list = document.getElementById('home-recent-list');
    if (!list) return;
    list.replaceChildren();
    const items = [...bankState.transactions].sort((a,b) => Date.parse(b.date)-Date.parse(a.date)).slice(0,3);
    if (!items.length) list.textContent = 'Nenhuma movimentação fictícia.';
    for (const item of items) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'home-recent-item';
        const icon = document.createElement('i');
        icon.className = 'fa-solid ' + (item.amount > 0 ? 'fa-arrow-down' : 'fa-arrow-up');
        icon.setAttribute('aria-hidden','true');
        const info = document.createElement('span');
        const title = document.createElement('strong');
        title.textContent = item.participant.name;
        const caption = document.createElement('small');
        caption.textContent = item.description + ' · ' + transactionStatus(item.status);
        info.append(title,caption);
        const amount = document.createElement('b');
        amount.className = item.amount > 0 ? 'recent-incoming' : '';
        amount.textContent = formatMoney(item.amount);
        button.append(icon,info,amount);
        button.addEventListener('click', () => showTransactionDetails(item.id));
        list.append(button);
    }
}
renderHomeRecent();
const homePreviewScreen = document.getElementById('screen-home');
new MutationObserver(() => {
    if (!homePreviewScreen.classList.contains('hidden')) renderHomeRecent();
}).observe(homePreviewScreen,{attributes:true,attributeFilter:['class']});

const previewCardState = { limit: 100000, purchases: [], payments: [] };
const previewStorageKey = 'justec-preview-card-v1';
try {
    const saved = JSON.parse(localStorage.getItem(previewStorageKey));
    if(saved && Number.isInteger(saved.limit) && saved.limit>=0 && saved.limit<=500000 &&
       Array.isArray(saved.purchases) && saved.purchases.every(p=>p && typeof p.name==='string' && p.name.length<=60 && Number.isInteger(p.cents) && p.cents>0) &&
       saved.purchases.reduce((sum,p)=>sum+p.cents,0)<=saved.limit){
        previewCardState.limit=saved.limit;
        previewCardState.purchases=saved.purchases;
        if(Array.isArray(saved.payments) && saved.payments.every(p=>Number.isSafeInteger(p.cents)&&p.cents>0&&typeof p.id==='string') && new Set(saved.payments.map(p=>p.id)).size===saved.payments.length) previewCardState.payments=saved.payments;
        if(saved.blocked===true) document.getElementById('preview-card-toggle').click();
    }
} catch(e) { /* Storage unavailable: retain session defaults. */ }
document.getElementById('preview-card-limit').value=previewCardState.limit/100;
function savePreviewCard(){
    try { localStorage.setItem(previewStorageKey,JSON.stringify({...previewCardState,blocked:document.getElementById('preview-card-toggle').getAttribute('aria-pressed')==='true'})); }
    catch(e) { /* Session remains usable without storage. */ }
}
document.getElementById('preview-card-toggle').addEventListener('click',savePreviewCard);
const cardSpent = () => previewCardState.purchases.reduce((sum,p) => sum+p.cents,0);
function restoreCardPayments(){
    for(const p of previewCardState.payments){
        if(bankState.transactions.some(t=>t.id===p.id)) continue;
        bankState.transactions.unshift({id:p.id,date:demoDate(),type:'pix-out',description:'Pagamento de fatura · simulação',amount:-p.cents/100,status:'completed',participant:{id:'justec-card',name:'Fatura JUSTEC',institution:'JUSTEC fictício'}});
    }
}
restoreCardPayments();
renderBalance();
renderHomeRecent();
const cardMoney = cents => (cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function renderPreviewCard() {
    savePreviewCard();
    document.getElementById('preview-limit-status').textContent = 'Limite disponível: '+cardMoney(previewCardState.limit-cardSpent());
    document.getElementById('preview-invoice').textContent = 'Fatura simulada: '+cardMoney(cardSpent());
    const list = document.getElementById('preview-purchases');
    list.replaceChildren();
    for(const p of [...previewCardState.purchases].reverse()){
        const li=document.createElement('li');
        li.textContent=p.name+' · '+cardMoney(p.cents);
        list.append(li);
    }
}
document.getElementById('preview-limit-save').addEventListener('click', () => {
    const value = document.getElementById('preview-card-limit').valueAsNumber;
    const status = document.getElementById('preview-limit-status');
    if (!Number.isInteger(value) || value < 0 || value > 5000 || value*100 < cardSpent()) {
        status.textContent = 'Informe um limite inteiro entre R$ 0 e R$ 5.000, não inferior à fatura.';
        return;
    }
    previewCardState.limit = value * 100;
    renderPreviewCard();
});
document.getElementById('preview-purchase-form').addEventListener('submit', e => {
    e.preventDefault();
    const status=document.getElementById('preview-purchase-status');
    const name=document.getElementById('preview-merchant').value.trim();
    const amount=document.getElementById('preview-purchase-amount').valueAsNumber;
    const cents=Math.round(amount*100);
    if(document.getElementById('preview-card-toggle').getAttribute('aria-pressed')==='true'){
        status.textContent='Compra recusada: cartão bloqueado.'; return;
    }
    if(!name || !Number.isFinite(amount) || cents<=0 || cents>previewCardState.limit-cardSpent()){
        status.textContent='Compra recusada: dados inválidos ou limite insuficiente.'; return;
    }
    previewCardState.purchases.push({name,cents});
    renderPreviewCard();
    e.target.reset();
    status.textContent='Compra fictícia aprovada.';
});
renderPreviewCard();

const payButton=document.createElement('button');
payButton.type='button';
payButton.textContent='Pagar fatura integral';
const payStatus=document.createElement('p');
payStatus.setAttribute('role','status');
document.getElementById('preview-invoice').after(payButton,payStatus);
payButton.addEventListener('click',()=>{
    const cents=cardSpent();
    if(!cents){payStatus.textContent='Não há fatura em aberto.';return;}
    if(cents>Math.round(bankState.balance*100)){payStatus.textContent='Saldo fictício insuficiente.';return;}
    const id='CARD-PAY-'+crypto.randomUUID();
    previewCardState.payments.push({id,cents});
    previewCardState.purchases=[];
    restoreCardPayments();
    renderPreviewCard();
    renderBalance();
    renderHomeRecent();
    payStatus.textContent='Fatura fictícia paga. Limite recomposto.';
});
