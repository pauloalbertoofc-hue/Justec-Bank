let pixDraft = null;
let pixJourney = createPixJourney();
let pixTimer = null;
let pixResolved = null;
let pixAnswers = {};
let pixAnswered = false;
let pixContextRequired = false;
let pixPriorSignature = null;
let pixEditCount = 0;
const pixElement = id => document.getElementById(id);
function pixMessage(message) { pixElement('pix-feedback').textContent = message; }
function stopPixTimer() { if (pixTimer !== null) clearInterval(pixTimer); pixTimer=null; }
function clearPixCredential() { pixElement('pix-demo-code').value=''; pixElement('pix-demo-confirm').checked=false; }
function hidePixPanels() {
    for (const id of ['pix-confirm','pix-guard','pix-pause','pix-auth','pix-result']) pixElement(id).hidden=true;
    for(const id of ['pix-triage','pix-extra-label','pix-start-pause']) pixElement(id).hidden=true;
    clearPixCredential(); stopPixTimer();
    for (const id of ['pix-data-confirm','pix-extra']) pixElement(id).checked=false;
    pixElement('pix-continue').disabled=true;
    pixElement('pix-submit').disabled=false;
    pixElement('pix-reconsider-options').hidden=true;pixElement('pix-share').hidden=true;
}
function resetPixSteps() {
    hidePixPanels(); pixElement('pix-form').hidden=false; pixDraft=null; pixJourney=createPixJourney(); pixAnswers={}; pixAnswered=false;
    for (const id of ['identity','urgency','advance','ignore']) pixElement('pix-'+id).value='unknown';
    pixMessage('');
}
function openPixFlow(type) {
    resetPixSteps(); pixResolved=null; pixPriorSignature=null;pixEditCount=0;pixElement('pix-form').reset();
    pixElement('pix-recipient').value=type==='suspicious'?'demo-high':'demo-low';
    pixElement('pix-value').hidden=true; pixElement('pix-recipient-info').textContent='';
    changePixMethod(); showPixEntry('pix-start-step',1); navigateTo('pix');
}
function changePixMethod() {
    pixElement('pix-custom').hidden=pixElement('pix-method').value!=='key';
    pixElement('pix-registered').hidden=pixElement('pix-method').value==='key';
    updatePixRecipient();
}
function updatePixRecipient(focus = true) {
    resetPixSteps(); pixResolved=null; pixElement('pix-value').hidden=true; pixElement('pix-recipient-info').textContent='';pixElement('pix-recipient-next').hidden=true;showPixEntry('pix-recipient-step',2,focus);
}
function resolvePixRecipient() {
    resetPixSteps(); pixResolved=null;
    const recipient=pixElement('pix-method').value==='key' ? lookupPixRecipient({key:pixElement('pix-key').value}) : lookupPixRecipient({id:pixElement('pix-recipient').value});
    if (!recipient) {pixElement('pix-value').hidden=true; return pixMessage('Destinatário inexistente na base demonstrativa. Use somente uma chave do catálogo.');}
    pixResolved=recipient; pixJourney.move('recipient');pixElement('pix-recipient-next').hidden=false;
    const restricted=bankState.restrictions.some(r=>r.recipientId===recipient.id && r.status!=='Restrição retirada');
    pixElement('pix-recipient-info').textContent=`${recipient.name} · ${recipient.institution} · Chave ${recipient.maskedKey}${restricted?' · Restrição interna demonstrativa ativa; esta tentativa será interrompida.':''}`;
    pixElement('pix-available').textContent=formatMoney(bankState.balance);
    pixMessage('Destinatário localizado somente no catálogo interno. Nenhuma titularidade real consultada.');
}
function parsePixAmount(value) {
    if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(value.trim())) return NaN;
    return Math.round(Number(value.trim().replaceAll('.', '').replace(',', '.')) * 100) / 100;
}
function formatPixAmount() {
    const input=pixElement('pix-amount'); const amount=parsePixAmount(input.value);
    if (Number.isFinite(amount)) input.value=amount.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
}
function isDemoKey(key) {
    return /^(?:\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2}|\d{14}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\+\d{10,15}|[^\s@]+@[^\s@]+\.[^\s@]+|[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12})$/i.test(key);
}
function currentPixRecipient() {
    return pixElement('pix-method').value==='key' ? lookupPixRecipient({key:pixElement('pix-key').value}) : lookupPixRecipient({id:pixElement('pix-recipient').value});
}
function validatePixOperation(draft) {
    const cents=pixAmountInCents(draft.amount);
    if(cents>200000) throw new Error('Limite demonstrativo: R$ 2.000,00 por operação.');
    if(cents>pixAmountInCents(bankState.balance,true)) throw new Error('Saldo fictício insuficiente.');
    const recipient=currentPixRecipient();
    if(!recipient || recipient.id!==draft.recipient.id || recipient.name!==draft.recipient.name || recipient.maskedKey!==draft.recipient.maskedKey || recipient.institution!==draft.recipient.institution) throw new Error('Destinatário alterado ou inexistente. Refaça a conferência.');
    if(parsePixAmount(pixElement('pix-amount').value)!==draft.amount) throw new Error('O valor mudou. Refaça a conferência.');
    return recipient;
}
function preparePix(event) {
    event.preventDefault();
    if(!pixResolved) return pixMessage('Confira primeiro um destinatário da base demonstrativa.');
    const recipient=currentPixRecipient();
    if(!recipient || recipient.id!==pixResolved.id) return pixMessage('Confira novamente o destinatário.');
    const amount=parsePixAmount(pixElement('pix-amount').value);
    if(!Number.isFinite(amount)||amount<=0) return pixMessage('Informe um valor positivo no formato 50,00.');
    const candidate={id:pixDraft?.id || demoId('PIX'),recipient,amount};
    try {validatePixOperation(candidate);} catch(error){return pixMessage(error.message);}
    const signature=JSON.stringify([recipient.id,amount]);
    if(pixPriorSignature!==null && pixPriorSignature!==signature) pixEditCount++;
    pixPriorSignature=signature;
    hidePixPanels(); pixJourney.revise(); pixAnswers={};pixAnswered=false;
    pixDraft={...candidate,editCount:pixEditCount,stage:'value'}; pixContextRequired=pixElement('pix-context-request').checked;
    pixJourney.move('confirmation'); pixDraft.stage=pixJourney.stage;
    renderPixSummary('pix-summary',pixDraft);
    pixElement('pix-form').hidden=true;pixElement('pix-confirm').hidden=false; focusPixPanel('pix-confirm');
    pixMessage('Confira todos os dados. Nenhum débito foi realizado.');
}
function focusPixPanel(id) { const step={'pix-confirm':4,'pix-guard':4,'pix-pause':5,'pix-auth':6,'pix-result':7}[id];if(step)setPixStep(step); const title=pixElement(id).querySelector('[tabindex="-1"]'); title?.focus(); }
function editPixDetails() {
    if(!pixDraft || ['completed','interrupted'].includes(pixJourney.stage)) return;
    hidePixPanels();pixElement('pix-form').hidden=false;pixJourney.revise();pixDraft=null;pixAnswered=false;pixAnswers={};showPixEntry('pix-value',3);pixElement('pix-amount').focus();
    pixMessage('Corrija os dados e faça uma nova conferência.');
}
function evaluationFor(draft) {
    const canonical=validatePixOperation(draft);
    const legacy=evaluateRisk(canonical,draft.amount);
    const evidence=collectPixEvidence(draft,bankState,pixAnswers,new Date().toISOString());
    const evaluation=evaluatePixEvidence(evidence,legacy);
    const uncertain=pixAnswered && ['identity','urgency','advance','ignore'].some(key=>pixAnswers[key]==='unknown');
    const policy=decidePixPolicy(evaluation,{triageRequired:pixContextRequired,answered:pixAnswered,uncertain});
    return {legacy,evidence,evaluation,policy};
}
function displayPixEvaluation(result) {
    Object.assign(pixDraft,{risk:result.legacy,evidence:result.evidence,evaluation:result.evaluation,policy:result.policy});
    pixElement('pix-guard').hidden=false;
    pixElement('pix-risk').textContent=`${{low:'Baixo risco',moderate:'Risco moderado',elevated:'Risco elevado'}[result.legacy.level]} · ${result.legacy.score} pontos heurísticos. ${result.policy.action}: ${result.policy.justification} ${result.evaluation.explanations.join('; ')} Nenhum indicador prova fraude. Sem consulta externa.`;
    const container=pixElement('pix-evidence');container.replaceChildren();
    result.evidence.indicators.forEach(item=>{const p=document.createElement('p');p.textContent=`${item.code}: ${item.available?String(item.value):'indisponível'} · Origem: ${item.source} · Coleta: ${item.collectedAt}`;container.append(p);});
}
function analyzePix() {
    if(!pixDraft || pixJourney.stage!=='confirmation') return;
    if(!pixElement('pix-data-confirm').checked) return pixMessage('Confirme explicitamente os dados fictícios.');
    try {
        validatePixOperation(pixDraft);pixAnswered=false;pixAnswers={};pixElement('pix-extra').checked=false;pixJourney.review(pixDraft);pixJourney.move('evaluation');pixDraft.stage='evaluation';
        const result=evaluationFor(pixDraft);displayPixEvaluation(result);
        if(result.policy.action==='BLOCKED') return interruptPix(pixDraft,result.legacy,result.policy.legacyBlock);
        if(result.policy.action==='NEEDS_VERIFICATION') {
            pixJourney.move('verification');pixDraft.stage='verification';pixElement('pix-triage').hidden=false;
            pixElement('pix-start-pause').hidden=true;pixMessage('Responda às perguntas contextuais; você pode escolher Não sei.');focusPixPanel('pix-guard');
        } else {pixElement('pix-triage').hidden=true;startPixPause();}
    } catch(error){pixMessage(error.message);}
}
function submitPixContext() {
    if(!pixDraft || pixJourney.stage!=='verification') return;
    pixAnswers=Object.fromEntries(['identity','urgency','advance','ignore'].map(key=>[key,pixElement('pix-'+key).value]));pixAnswered=true;
    pixElement('pix-extra').checked=false;
    try {
        pixJourney.move('evaluation');pixDraft.stage='evaluation';const result=evaluationFor(pixDraft);displayPixEvaluation(result);
        if(result.policy.action==='BLOCKED') return interruptPix(pixDraft,result.legacy,result.policy.legacyBlock);
        if(result.policy.action==='INCONCLUSIVE'){pixJourney.move('verification');pixDraft.stage='verification';pixElement('pix-start-pause').hidden=true;return pixMessage(result.policy.justification);}
        pixJourney.move('verification');pixDraft.stage='verification';
        pixElement('pix-extra-label').hidden=!(result.policy.action==='NEEDS_VERIFICATION'||result.legacy.level==='moderate');
        pixElement('pix-start-pause').hidden=false;
        pixMessage(result.policy.justification);
    } catch(error){pixMessage(error.message);}
}
function startPixPause() {
    if(!pixDraft || !['evaluation','verification'].includes(pixJourney.stage)) return;
    try {
        const result=evaluationFor(pixDraft);displayPixEvaluation(result);
        if(result.policy.action==='BLOCKED') return interruptPix(pixDraft,result.legacy,result.policy.legacyBlock);
        if(result.policy.action==='INCONCLUSIVE' || (result.policy.action==='NEEDS_VERIFICATION'&&!pixAnswered)) return pixMessage('Conclua a verificação contextual antes da pausa.');
        if((result.policy.action==='NEEDS_VERIFICATION'||result.legacy.level==='moderate')&&!pixElement('pix-extra').checked) return pixMessage('Confirme que entendeu o alerta para prosseguir.');
        if(pixJourney.stage==='verification') pixJourney.move('evaluation');
        pixJourney.move('pause');pixJourney.pause(pixConfig.reflectionMs);pixDraft.stage='pause';
        pixElement('pix-confirm').hidden=true;pixElement('pix-guard').hidden=true;pixElement('pix-triage').hidden=true;pixElement('pix-extra-label').hidden=true;pixElement('pix-start-pause').hidden=true;pixElement('pix-pause').hidden=false;
        pixElement('pix-continue').disabled=true;pixElement('pix-reconsider-options').hidden=true;
        pixElement('pix-pause-summary').textContent=`${pixDraft.recipient.name} · ${formatMoney(pixDraft.amount)}`;
        pixElement('pix-tip').textContent=selectPixTip(pixDraft.evidence).text;
        const duration=pixConfig.reflectionMs;const tick=()=>{
            if(pixJourney.stage!=='pause') return stopPixTimer();
            const remaining=pixJourney.remaining();pixElement('pix-reflection').value=duration?100*(1-remaining/duration):100;
            if(remaining===0){stopPixTimer();pixElement('pix-continue').disabled=false;pixElement('pix-pause-status').textContent='Pausa concluída. Você decide se deseja continuar para o código demonstrativo.';}
        };
        pixElement('pix-pause-status').textContent='Reflita e confira os dados. Nenhum processamento bancário está em andamento.';
        stopPixTimer();pixTimer=setInterval(tick,100);tick();focusPixPanel('pix-pause');
        pixMessage('Nada será enviado automaticamente.');
    } catch(error){pixMessage(error.message);}
}
function reconsiderPix(destination) {
    if(!pixDraft || !['pause','authentication','verification','confirmation'].includes(pixJourney.stage)) return;
    stopPixTimer();clearPixCredential();pixJourney.reconsider();pixDraft.stage=pixJourney.stage;
    pixElement('pix-continue').disabled=true;
    if(!destination){pixElement('pix-reconsider-options').hidden=false;return pixMessage('Escolha voltar à revisão ou abrir a triagem. O rascunho foi preservado, sem débito.');}
    hidePixPanels();pixElement('pix-confirm').hidden=false;pixElement('pix-data-confirm').checked=false;
    if(destination==='triage'){navigateTo('screening');}else{focusPixPanel('pix-confirm');}
    pixMessage('Rascunho preservado. Uma nova conferência e pausa serão necessárias.');
}
function showDemoAuthentication() {
    if(!pixDraft) return;
    try{validatePixOperation(pixDraft);pixJourney.authenticate(pixDraft);pixDraft.stage=pixJourney.stage;
        pixElement('pix-pause').hidden=true;pixElement('pix-auth').hidden=false;clearPixCredential();focusPixPanel('pix-auth');
        pixMessage('Use somente 0000. Nunca informe senha bancária real.');
    }catch(error){pixMessage(error.message);}
}
function interruptPix(draft,risk,restrict=true) {
    if(!['evaluation','authentication'].includes(pixJourney.stage)) return;
    pixJourney.move('interrupted');draft.stage=pixJourney.stage;stopPixTimer();clearPixCredential();
    recordInterruptedPix(draft,{...risk,reasons:[...risk.reasons,...(draft.policy?.justification?[draft.policy.justification]:[])]},restrict);
    for(const id of ['pix-auth','pix-pause','pix-confirm']) pixElement(id).hidden=true;
    pixElement('pix-result').hidden=false;pixElement('pix-result-text').textContent=`Operação fictícia interrompida, sem desconto do saldo. ${draft.policy?.justification||risk.reasons.join('; ')} ${restrict?'Restrição interna simulada, sem bloqueio no DICT.':'Indícios contextuais não criam restrição permanente de destinatário.'}`;
    pixElement('pix-review').hidden=!restrict;pixElement('pix-receipt').hidden=true;pixElement('pix-guard').hidden=true;pixElement('pix-share').hidden=true;pixElement('pix-result-icon').textContent='!';pixElement('pix-result-icon').dataset.outcome='interrupted';renderPixSummary('pix-result-details',draft);
    pixMessage('Tentativa registrada somente no histórico de interrupções.');focusPixPanel('pix-result');
}
function completePix() {
    const draft=pixDraft;
    if(!draft || pixJourney.stage!=='authentication') return;
    if(!pixElement('pix-demo-confirm').checked) return pixMessage('Confirme a operação fictícia para continuar.');
    const credential=pixElement('pix-demo-code').value;clearPixCredential();
    try {
        pixJourney.assertReviewed(draft);validatePixOperation(draft);const result=evaluationFor(draft);displayPixEvaluation(result);
        if(result.policy.action==='BLOCKED') return interruptPix(draft,result.legacy,result.policy.legacyBlock);
        if(result.policy.action==='INCONCLUSIVE'||(result.policy.action==='NEEDS_VERIFICATION'&&!pixAnswered)) throw new Error('Verificação adicional necessária. Refaça a conferência.');
        if((result.policy.action==='NEEDS_VERIFICATION'||result.legacy.level==='moderate')&&!pixElement('pix-extra').checked) throw new Error('Confirmação adicional necessária.');
        pixJourney.authorize(draft,credential,recordApprovedPix);
    } catch(error){pixElement('pix-result').hidden=true;pixElement('pix-receipt').hidden=true;return pixMessage(error.message);}
    draft.stage=pixJourney.stage;pixElement('pix-submit').disabled=true;pixElement('pix-guard').hidden=true;pixElement('pix-auth').hidden=true;
    renderBalance();renderStatementBalance();pixElement('pix-result').hidden=false;
    pixElement('pix-result-text').textContent=`Pix fictício de ${formatMoney(draft.amount)} registrado. SIMULAÇÃO — SEM VALOR FINANCEIRO.`;
    pixElement('pix-receipt').hidden=false;pixElement('pix-review').hidden=true;pixElement('pix-share').hidden=false;pixElement('pix-result-icon').textContent='✓';pixElement('pix-result-icon').dataset.outcome='completed';renderPixSummary('pix-result-details',draft,true);
    pixMessage('Simulação concluída. Saldo e extrato atualizados uma única vez.');focusPixPanel('pix-result');
}
function openPixReceipt(){if(!pixDraft||pixJourney.stage!=='completed')return;navigateTo('statement');showTransactionDetails(pixDraft.id);}
function onPixNavigation(screenId) {
    if(screenId!=='pix' && pixDraft && !['completed','interrupted'].includes(pixJourney.stage)) {
        stopPixTimer();clearPixCredential();pixJourney.leave();pixDraft.stage=pixJourney.stage;
        hidePixPanels();pixElement('pix-confirm').hidden=false;pixElement('pix-resume').hidden=false;
    }
    if(screenId==='pix'){pixJourney.resume();pixElement('pix-resume').hidden=true;}
}
function resumePix(){navigateTo('pix');focusPixPanel('pix-confirm');pixMessage('Confira novamente os dados para retomar. Nenhuma autorização anterior foi mantida.');}
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

document.getElementById('pix-form').addEventListener('input', event => {
    if(event.target.id==='pix-key') return updatePixRecipient(false);
    if(['pix-amount','pix-context-request'].includes(event.target.id) && pixDraft){
        hidePixPanels();pixElement('pix-form').hidden=false;pixJourney.revise();pixDraft=null;pixAnswered=false;pixAnswers={};pixMessage('Dados alterados. Refaça a conferência.');
    }
});
for(const key of ['identity','urgency','advance','ignore']) pixElement('pix-'+key).addEventListener('change',()=>{
    if(pixJourney.stage==='verification'){pixAnswered=false;pixElement('pix-start-pause').hidden=true;pixElement('pix-extra').checked=false;}
});

function setPixStep(number) {
    const names=['Iniciar Pix','Destinatário','Valor','Conferência','Pausa Preventiva','Autorização','Resultado'];
    document.querySelectorAll('[data-pix-step]').forEach(el=>{if(Number(el.dataset.pixStep)===number)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});
    pixElement('pix-step-label').textContent=`Etapa ${number} de 7 · ${names[number-1]}`;
}
function showPixEntry(id,step,focus=true) {
    for(const entry of ['pix-start-step','pix-recipient-step','pix-value'])pixElement(entry).hidden=entry!==id;
    setPixStep(step);if(focus)pixElement(id).querySelector('h3')?.focus();
}
function choosePixMethod(method) {pixElement('pix-method').value=method;changePixMethod();}
function backPixStart(){resetPixSteps();pixResolved=null;showPixEntry('pix-start-step',1);}
function goPixValue(){
    if(!pixResolved || pixJourney.stage!=='recipient')return pixMessage('Confira primeiro o destinatário.');
    const current=currentPixRecipient();if(!current||current.id!==pixResolved.id)return pixMessage('Destinatário alterado. Confira novamente.');
    pixJourney.move('value');showPixEntry('pix-value',3);pixElement('pix-amount').focus();
}
function renderPixSummary(id,draft,completed=false){
    const list=pixElement(id);list.replaceChildren();
    const lines=[['Destinatário',draft.recipient.name],['Instituição',draft.recipient.institution],['Chave Pix',draft.recipient.maskedKey],['Valor',formatMoney(draft.amount)]];
    if(completed)lines.push(['Data da simulação',transactionDate(demoDate())],['ID da transação',draft.id]);
    for(const [label,value]of lines){const row=document.createElement('div');const term=document.createElement('dt');term.textContent=label;const description=document.createElement('dd');description.textContent=value;row.append(term,description);list.append(row);}
}
function pixPad(target,key){
    const input=pixElement(target==='amount'?'pix-amount':'pix-demo-code');
    if(target==='amount' && (!pixElement('pix-value').checkVisibility() || pixJourney.stage!=='value'))return;
    if(target==='code' && pixJourney.stage!=='authentication')return;
    if(key==='erase')input.value=input.value.slice(0,-1);
    else if(target==='amount'){if(key===','&&input.value.includes(','))return;input.value+=key;}
    else if(input.value.length<4 && /^\d$/.test(key))input.value+=key;
    input.dispatchEvent(new Event('input',{bubbles:true}));
}
for(const [id,target]of [['pix-amount-pad','amount'],['pix-code-pad','code']]){
    const keys=['1','2','3','4','5','6','7','8','9',target==='amount'?',':null,'0','erase'];
    for(const key of keys){if(key===null){pixElement(id).append(document.createElement('span'));continue;}const button=document.createElement('button');button.type='button';button.textContent=key==='erase'?'⌫':key;button.setAttribute('aria-label',key==='erase'?'Apagar último dígito':key===','?'Vírgula decimal':`Dígito ${key}`);button.addEventListener('click',()=>pixPad(target,key));pixElement(id).append(button);}
}
async function sharePixReceipt(){
    const draft=pixDraft;if(!draft||pixJourney.stage!=='completed')return;
    const text=`JUSTEC Bank — SIMULAÇÃO — SEM VALOR FINANCEIRO\n${draft.recipient.name}\n${draft.recipient.institution}\nChave ${draft.recipient.maskedKey}\n${formatMoney(draft.amount)}\n${transactionDate(demoDate())}\n${draft.id}`;
    try{if(navigator.share)await navigator.share({title:'Comprovante fictício JUSTEC',text});else await navigator.clipboard.writeText(text);pixMessage('Comprovante fictício compartilhado ou copiado.');}catch{pixMessage('Não foi possível compartilhar ou copiar. Abra o comprovante demonstrativo para consultar os dados.');}
}
