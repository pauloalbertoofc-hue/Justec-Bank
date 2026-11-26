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

const previewCardState = { limit: 100000, purchases: [], payments: [], refunds: [], claims: [] };
const previewStorageKey = 'justec-preview-card-v1';
try {
    const saved = JSON.parse(localStorage.getItem(previewStorageKey));
    if(saved && Number.isInteger(saved.limit) && saved.limit>=0 && saved.limit<=500000 &&
       Array.isArray(saved.purchases) && saved.purchases.every(p=>p && typeof p.name==='string' && p.name.length<=60 && Number.isInteger(p.cents) && p.cents>0) &&
       saved.purchases.reduce((sum,p)=>sum+p.cents,0)<=saved.limit){
        previewCardState.limit=saved.limit;
        previewCardState.purchases=saved.purchases;
        if(Array.isArray(saved.claims)) previewCardState.claims=saved.claims.filter(c=>c&&typeof c.id==='string'&&typeof c.name==='string'&&['pending','approved','rejected','obsolete'].includes(c.status)&&Number.isSafeInteger(c.cents)&&c.cents>0);
        if(Array.isArray(saved.refunds)) previewCardState.refunds=saved.refunds.filter(p=>p&&typeof p.name==='string'&&Number.isSafeInteger(p.cents)&&p.cents>0);
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
    for(const refund of previewCardState.refunds){
        if(!refund.creditId||bankState.transactions.some(t=>t.id===refund.creditId)) continue;
        bankState.transactions.unshift({id:refund.creditId,date:demoDate(),type:'pix-in',description:'Estorno de cartão · simulação',amount:refund.cents/100,status:'completed',participant:{id:'justec-card',name:'Estorno JUSTEC',institution:'JUSTEC fictício'}});
    }
    for(const p of previewCardState.payments){
        if(bankState.transactions.some(t=>t.id===p.id)) continue;
        bankState.transactions.unshift({id:p.id,date:demoDate(),type:'pix-out',description:(p.partial===true?'Pagamento parcial de fatura':'Pagamento de fatura')+' · simulação',amount:-p.cents/100,status:'completed',participant:{id:'justec-card',name:'Fatura JUSTEC',institution:'JUSTEC fictício'}});
    }
}
restoreCardPayments();
renderBalance();
renderHomeRecent();
const cardMoney = cents => (cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function renderPreviewCard() {
    for(const p of previewCardState.purchases){
        if(!p.id) p.id=crypto.randomUUID();
        if(!Number.isSafeInteger(p.originalCents)||p.originalCents<p.cents) p.originalCents=p.cents;
    }
    savePreviewCard();
    renderPurchaseClaims();
    document.getElementById('preview-limit-status').textContent = 'Limite disponível: '+cardMoney(previewCardState.limit-cardSpent());
    document.getElementById('preview-invoice').textContent = 'Fatura simulada: '+cardMoney(cardSpent());
    renderPaidInvoices();
    const list = document.getElementById('preview-purchases');
    list.replaceChildren();
    for(const p of [...previewCardState.purchases].reverse()){
        const li=document.createElement('li');
        li.textContent=p.name+' · '+cardMoney(p.cents);
        const dispute=document.createElement('button');
        dispute.type='button';
        dispute.textContent='Contestar saldo desta compra';
        dispute.addEventListener('click',()=>{
            if(!previewCardState.purchases.includes(p)) return;
            if(!previewCardState.claims.some(c=>c.id===p.id&&c.status==='pending')){
                previewCardState.claims.push({id:p.id,protocol:'JUSTEC-COMPRA-'+crypto.randomUUID(),name:p.name,cents:p.cents,status:'pending'});
            }
            renderPreviewCard();
            navigateTo('reviews');
        });
        li.append(' ',dispute);
        list.append(li);
    }
    for(const refund of previewCardState.refunds){
        const li=document.createElement('li');
        li.textContent=refund.name+' · Estorno aprovado (simulação) · '+cardMoney(refund.cents);
        const receipt=document.createElement('details');
        const summary=document.createElement('summary');
        summary.textContent='Comprovante de estorno fictício';
        receipt.append(summary);
        for(const line of ['Protocolo: '+(refund.protocol||'Registro anterior sem protocolo'),'Estabelecimento: '+refund.name,'Valor: '+cardMoney(refund.cents),'Destino: '+(refund.creditId?'Saldo bancário fictício':'Cancelamento do saldo em aberto da fatura'),'Sem validade financeira']){
            const row=document.createElement('p');row.textContent=line;receipt.append(row);
        }
        if(refund.creditId){
            const link=document.createElement('button');
            link.type='button';link.textContent='Consultar movimentação no extrato';
            link.addEventListener('click',()=>showTransactionDetails(refund.creditId));
            receipt.append(link);
        }
        li.append(receipt);
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
    previewCardState.purchases.push({id:crypto.randomUUID(),name,cents,originalCents:cents});
    renderPreviewCard();
    e.target.reset();
    status.textContent='Compra fictícia aprovada.';
});
function renderPaidInvoices(){
    let list=document.getElementById('preview-paid-invoices');
    if(!list){
        const section=document.createElement('section');
        const heading=document.createElement('h3');
        heading.textContent='Histórico de pagamentos';
        list=document.createElement('div');
        list.id='preview-paid-invoices';
        section.append(heading,list);
        document.getElementById('preview-purchases').after(section);
    }
    list.replaceChildren();
    if(!previewCardState.payments.length) list.textContent='Nenhum pagamento registrado.';
    for(const payment of [...previewCardState.payments].reverse()){
        const details=document.createElement('details');
        const summary=document.createElement('summary');
        summary.textContent=(payment.partial===true?'Pagamento parcial':payment.partial===false?'Quitação integral':'Pagamento registrado')+' · '+cardMoney(payment.cents);
        details.append(summary);
        if(Array.isArray(payment.items)){
            for(const item of payment.items){
                const row=document.createElement('p');
                row.textContent=String(item.name)+' · '+cardMoney(item.cents);
                details.append(row);
                if(item.id){
                    const claim=document.createElement('button');
                    claim.type='button';claim.textContent='Contestar parcela paga';
                    claim.addEventListener('click',()=>{
                        const key=payment.id+':'+item.id;
                        if(!previewCardState.claims.some(c=>c.id===key&&['pending','approved'].includes(c.status))){
                            previewCardState.claims.push({id:key,name:item.name,cents:item.cents,status:'pending',paid:true,paymentId:payment.id,purchaseId:item.id,protocol:'JUSTEC-COMPRA-'+crypto.randomUUID()});
                        }
                        renderPreviewCard();navigateTo('reviews');
                    });
                    details.append(claim);
                }
            }
        }
        const receipt=document.createElement('button');
        receipt.type='button';
        receipt.textContent='Ver comprovante fictício';
        receipt.addEventListener('click',()=>showTransactionDetails(payment.id));
        details.append(receipt);
        list.append(details);
    }
}
renderPreviewCard();

const payButton=document.createElement('button');
payButton.type='button';
payButton.textContent='Pagar fatura integral';
const payStatus=document.createElement('p');
payStatus.setAttribute('role','status');
document.getElementById('preview-invoice').after(payButton,payStatus);
const partialInput=document.createElement('input');
partialInput.type='number'; partialInput.min='0.01'; partialInput.step='0.01';
partialInput.setAttribute('aria-label','Valor do pagamento parcial em reais');
const partialButton=document.createElement('button');
partialButton.type='button'; partialButton.textContent='Pagar valor parcial';
payStatus.after(partialInput,partialButton);
payButton.addEventListener('click',()=>settleCardInvoice(cardSpent()));
partialButton.addEventListener('click',()=>{
    const value=partialInput.valueAsNumber;
    const cents=Math.round(value*100);
    if(!Number.isSafeInteger(cents)||cents<=0||value!==cents/100||cents>cardSpent()){
        payStatus.textContent='Informe um valor positivo até o total da fatura.';return;
    }
    settleCardInvoice(cents);
});
function settleCardInvoice(cents){
    if(!cents){payStatus.textContent='Não há fatura em aberto.';return;}
    if(cents>Math.round(bankState.balance*100)){payStatus.textContent='Saldo fictício insuficiente.';return;}
    const id='CARD-PAY-'+crypto.randomUUID();
    let remaining=cents;
    const paid=[], outstanding=[];
    for(const item of previewCardState.purchases){
        const applied=Math.min(remaining,item.cents);
        if(applied>0) paid.push({...item,cents:applied});
        if(item.cents>applied) outstanding.push({...item,cents:item.cents-applied});
        remaining-=applied;
    }
    previewCardState.payments.push({id,cents,items:paid,partial:outstanding.length>0});
    previewCardState.purchases=outstanding;
    restoreCardPayments();
    renderPreviewCard();
    renderBalance();
    renderHomeRecent();
    payStatus.textContent=cardSpent()?'Pagamento parcial registrado. Limite recomposto proporcionalmente.':'Fatura fictícia paga. Limite recomposto.';
    partialInput.value='';
}

/* Educational card alert, separate from actual purchase and Pix ledgers. */
const cardGuardPanel=document.createElement('section');
cardGuardPanel.className='demo-panel';
const guardHeading=document.createElement('h3');
guardHeading.textContent='JUSTEC Guard · Segurança do cartão';
const guardStart=document.createElement('button');
guardStart.type='button'; guardStart.textContent='Simular alerta de compra suspeita';
const guardResult=document.createElement('p');
guardResult.setAttribute('role','status');
const guardActions=document.createElement('div');
guardActions.hidden=true;
const recognize=document.createElement('button');
recognize.type='button'; recognize.textContent='Reconheço a compra';
const reject=document.createElement('button');
reject.type='button'; reject.textContent='Não reconheço a compra';
const guidance=document.createElement('button');
guidance.type='button'; guidance.textContent='Consultar orientação pós-golpe'; guidance.hidden=true;
guidance.addEventListener('click',()=>navigateTo('action-post'));
guardActions.append(recognize,reject);
cardGuardPanel.append(guardHeading,guardStart,guardResult,guardActions,guidance);
document.getElementById('screen-cards-preview').append(cardGuardPanel);
guardStart.addEventListener('click',()=>{
    guardResult.textContent='Cenário fictício: tentativa de compra de R$ 289,90 em estabelecimento desconhecido. Nenhuma cobrança foi realizada. Você reconhece a tentativa?';
    guardActions.hidden=false; guidance.hidden=true;
});
recognize.addEventListener('click',()=>{
    guardResult.textContent='Reconhecimento registrado nesta simulação. Nenhuma compra ou cobrança foi criada.';
    guardActions.hidden=true;
});
reject.addEventListener('click',()=>{
    const toggle=document.getElementById('preview-card-toggle');
    if(toggle.getAttribute('aria-pressed')!=='true') toggle.click();
    guardResult.textContent='Cartão fictício bloqueado preventivamente. Em um caso real, contate a instituição pelos canais oficiais e solicite a contestação da compra.';
    guardActions.hidden=true; guidance.hidden=false;
});

const guardStorageKey='justec-preview-guard-v1';
let guardSaved={};
try { guardSaved=JSON.parse(localStorage.getItem(guardStorageKey))||{}; } catch(e){}
const cardAlertHistory=Array.isArray(guardSaved.alerts)?guardSaved.alerts.filter(a=>a&&['Aguardando reconhecimento','Reconhecida','Não reconhecida · bloqueio preventivo'].includes(a.status)):[];
const cardAlertSection=document.createElement('section');
cardAlertSection.className='demo-panel';
const cardAlertTitle=document.createElement('h3');
cardAlertTitle.textContent='Histórico de alertas do cartão';
const cardAlertList=document.createElement('ul');
cardAlertSection.append(cardAlertTitle,cardAlertList);
document.getElementById('screen-security').append(cardAlertSection);
let activeCardAlert=cardAlertHistory.at(-1)||null;
const homeCardNotice=document.createElement('section');
homeCardNotice.className='demo-panel';
homeCardNotice.hidden=true;
const homeCardNoticeTitle=document.createElement('h3');
homeCardNoticeTitle.textContent='JUSTEC Guard · Notificações';
const homeCardNoticeText=document.createElement('p');
homeCardNoticeText.setAttribute('role','status');
const homeCardNoticeLink=document.createElement('button');
homeCardNoticeLink.type='button';
homeCardNoticeLink.textContent='Consultar alerta do cartão';
homeCardNoticeLink.addEventListener('click',()=>navigateTo('cards-preview'));
homeCardNotice.append(homeCardNoticeTitle,homeCardNoticeText,homeCardNoticeLink);
document.getElementById('home-services').before(homeCardNotice);
function renderCardAlerts(){
    persistGuard();
    const pending=cardAlertHistory.filter(a=>a.status==='Aguardando reconhecimento').length;
    homeCardNotice.hidden=pending===0;
    homeCardNoticeText.textContent=pending?'Você tem uma tentativa fictícia de compra aguardando reconhecimento. Nenhuma cobrança foi realizada.':'';

    cardAlertList.replaceChildren();
    if(!cardAlertHistory.length) cardAlertList.textContent='Nenhum alerta nesta sessão.';
    for(const alert of [...cardAlertHistory].reverse()){
        const li=document.createElement('li');
        li.textContent='Tentativa fictícia · R$ 289,90 · '+alert.status;
        cardAlertList.append(li);
    }
}
guardStart.addEventListener('click',()=>{
    if(activeCardAlert&&activeCardAlert.status==='Aguardando reconhecimento') return;
    activeCardAlert={status:'Aguardando reconhecimento'};
    cardAlertHistory.push(activeCardAlert);
    renderCardAlerts();
});
recognize.addEventListener('click',()=>{
    if(activeCardAlert) activeCardAlert.status='Reconhecida';
    renderCardAlerts();
});
reject.addEventListener('click',()=>{
    if(activeCardAlert) activeCardAlert.status='Não reconhecida · bloqueio preventivo';
    renderCardAlerts();
});
// Initial render deferred until both ledgers are initialized.

const cardDisputes=Array.isArray(guardSaved.disputes)?guardSaved.disputes.filter(d=>d&&typeof d.protocol==='string'&&[1,2,3].includes(d.stage)&&typeof d.status==='string'):[];
const disputePanel=document.createElement('section');
disputePanel.className='demo-panel';
const disputeTitle=document.createElement('h3');
disputeTitle.textContent='Contestações de cartão · Simulação';
const disputeList=document.createElement('div');
disputePanel.append(disputeTitle,disputeList);
document.getElementById('screen-reviews').append(disputePanel);
const disputeButton=document.createElement('button');
disputeButton.type='button';
disputeButton.textContent='Registrar ocorrência fictícia';
disputeButton.hidden=true;
cardGuardPanel.append(disputeButton);
function renderCardDisputes(){
    persistGuard();
    disputeList.replaceChildren();
    if(!cardDisputes.length) disputeList.textContent='Nenhuma ocorrência de cartão nesta sessão.';
    for(const item of [...cardDisputes].reverse()){
        const entry=document.createElement('p');
        entry.textContent=item.protocol+' · Tentativa não reconhecida · R$ 289,90 · '+item.status;
        const details=document.createElement('section');
        details.append(entry);
        const stage=document.createElement('p');
        stage.textContent='Etapa '+(item.stage||1)+' de 3 · Atendimento educativo';
        details.append(stage);
        if((item.stage||1)<3){
            const advance=document.createElement('button');
            advance.type='button';
            advance.textContent=(item.stage||1)===1?'Simular início da análise':'Simular encerramento da análise';
            advance.addEventListener('click',()=>{
                item.stage=(item.stage||1)+1;
                item.status=item.stage===2?'Em análise simulada':'Encerrada · tentativa sem débito, sem estorno';
                renderCardDisputes();
            });
            details.append(advance);
        }
        disputeList.append(details);
    }
}
guardStart.addEventListener('click',()=>{disputeButton.hidden=true;});
recognize.addEventListener('click',()=>{disputeButton.hidden=true;});
reject.addEventListener('click',()=>{disputeButton.hidden=false;});
disputeButton.addEventListener('click',()=>{
    if(!activeCardAlert||!activeCardAlert.status.startsWith('Não reconhecida')) return;
    if(!activeCardAlert.protocol){
        activeCardAlert.protocol='JUSTEC-CARD-'+String(cardDisputes.length+1).padStart(4,'0');
        cardDisputes.push({protocol:activeCardAlert.protocol,stage:1,status:'Ocorrência registrada · sem cobrança'});
    }
    renderCardDisputes();
    navigateTo('reviews');
});
renderCardDisputes();

function persistGuard(){
    try { localStorage.setItem(guardStorageKey,JSON.stringify({alerts:cardAlertHistory,disputes:cardDisputes})); } catch(e){}
}
if(activeCardAlert?.status==='Aguardando reconhecimento'){
    guardResult.textContent='Cenário fictício: tentativa de compra de R$ 289,90 aguardando reconhecimento. Nenhuma cobrança realizada.';
    guardActions.hidden=false;
} else if(activeCardAlert?.status.startsWith('Não reconhecida')){
    guardResult.textContent='Tentativa não reconhecida registrada.';
    guidance.hidden=false;
    disputeButton.hidden=false;
}
renderCardAlerts();

function renderPurchaseClaims(){
    let panel=document.getElementById('preview-purchase-claims');
    if(!panel){
        panel=document.createElement('section');
        panel.id='preview-purchase-claims';panel.className='demo-panel';
        document.getElementById('screen-reviews').append(panel);
    }
    panel.replaceChildren();
    const heading=document.createElement('h3');
    heading.textContent='Contestações de compras em aberto';
    panel.append(heading);
    for(const c of previewCardState.claims){
        const entry=document.createElement('p');
        entry.textContent=c.name+' · '+cardMoney(c.cents)+' · '+({pending:'Em análise',approved:'Estorno aprovado',rejected:'Rejeitada',obsolete:'Saldo alterado: nova análise necessária'}[c.status]);
        const protocol=document.createElement('small');
        protocol.textContent='Protocolo: '+(c.protocol||'JUSTEC-COMPRA-'+c.id);
        const reason=document.createElement('p');
        reason.textContent=({pending:'Aguardando decisão educativa.',approved:c.paid?'Parcela paga devolvida ao saldo fictício.':'Saldo em aberto cancelado; nenhum crédito em conta.',rejected:'Cobrança mantida no cenário de rejeição escolhido.',obsolete:'O saldo da compra mudou durante a análise.'})[c.status];
        const card=document.createElement('article');
        card.className='preview-claim-card';
        card.dataset.claimStatus=c.status;
        card.append(protocol,entry,reason);
        panel.append(card);
        if(c.status!=='pending') continue;
        for(const approved of [true,false]){
            const button=document.createElement('button');
            button.type='button';button.textContent=approved?'Simular aprovação':'Simular rejeição';
            button.addEventListener('click',()=>{
                if(c.status!=='pending') return;
                const p=previewCardState.purchases.find(p=>p.id===c.id);
                if(!approved) c.status='rejected';
                else if(c.paid===true){
                    const item=previewCardState.payments.find(x=>x.id===c.paymentId)?.items?.find(x=>x.id===c.purchaseId);
                    const creditId='CARD-REFUND-'+c.id;
                    if(!item||item.cents!==c.cents||previewCardState.refunds.some(x=>x.creditId===creditId)) c.status='obsolete';
                    else {c.status='approved';previewCardState.refunds.push({name:c.name,cents:c.cents,creditId,protocol:c.protocol});restoreCardPayments();renderBalance();renderHomeRecent();}
                }
                else if(!p||p.cents!==c.cents) c.status='obsolete';
                else {
                    c.status='approved';
                    previewCardState.refunds.push({id:p.id,protocol:c.protocol||'JUSTEC-COMPRA-'+c.id,name:p.name,cents:p.cents});
                    previewCardState.purchases=previewCardState.purchases.filter(item=>item!==p);
                }
                renderPreviewCard();
            });
            card.append(button);
        }
    }
}
