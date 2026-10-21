// Adaptador do motor vigente. O motor ESM experimental js/guard/ permanece isolado.
const pixPolicyRules = Object.freeze({version:'justec-pix-policy/1.0.0', minimumHistory:3, atypicalMultiplier:3});
function collectPixEvidence(draft, state, answers = {}, collectedAt) {
    if (!draft || !Number.isFinite(draft.amount) || typeof collectedAt !== 'string') throw new TypeError('Dados de avaliação inválidos.');
    const outgoing = state.transactions.filter(tx => tx.type === 'pix-out' && tx.status === 'completed');
    const sufficient = outgoing.length >= pixPolicyRules.minimumHistory;
    const mean = sufficient ? outgoing.reduce((sum, tx) => sum + Math.abs(tx.amount),0) / outgoing.length : null;
    const released = state.restrictions.some(r => r.recipientId === draft.recipient.id && r.status === 'Restrição retirada');
    const indicator = (code,value,source,available=true) => ({code,value:available?value:null,source,collectedAt,available});
    return { version:'justec-pix-evidence/1.0.0', collectedAt, indicators:[
        indicator('NEW_RECIPIENT', !outgoing.some(tx=>tx.participant?.id===draft.recipient.id), 'bankState.transactions: participante identificado'),
        indicator('ATYPICAL_AMOUNT', sufficient && draft.amount > mean * pixPolicyRules.atypicalMultiplier, 'bankState.transactions: média de Pix concluídos', sufficient),
        indicator('REPEATED_ATTEMPTS', !released && state.attempts.filter(a=>a.recipientId===draft.recipient.id).length>=2, 'bankState.attempts'),
        indicator('OPERATION_CHANGED', (draft.editCount||0)>=2, 'rascunho: alterações entre conferências'),
        indicator('ACTIVE_RESTRICTION', state.restrictions.some(r=>r.recipientId===draft.recipient.id && r.status!=='Restrição retirada'), 'bankState.restrictions'),
        indicator('URGENCY', answers.urgency==='yes', 'triagem: relato do usuário', ['yes','no'].includes(answers.urgency)),
        indicator('ADVANCE_PAYMENT', answers.advance==='yes', 'triagem: relato do usuário', ['yes','no'].includes(answers.advance)),
        indicator('IDENTITY_DOUBT', answers.identity==='no', 'triagem: relato do usuário', ['yes','no'].includes(answers.identity)),
        indicator('IGNORE_WARNINGS', answers.ignore==='yes', 'triagem: relato do usuário', ['yes','no'].includes(answers.ignore)),
        indicator('SESSION_SIGNAL', null, 'não há telemetria de sessão confiável', false)
    ]};
}
function evaluatePixEvidence(evidence, legacy) {
    const active=evidence.indicators.filter(i=>i.available && i.value===true).map(i=>i.code);
    const unknown=evidence.indicators.filter(i=>!i.available).map(i=>i.code);
    return {version:pixPolicyRules.version, classification:legacy.level, legacy:{...legacy,reasons:[...legacy.reasons]}, codes:active, unavailable:unknown,
        explanations:[...legacy.reasons,...active.map(code=>({NEW_RECIPIENT:'Sem envio anterior identificado para esse destinatário na sessão.',ATYPICAL_AMOUNT:'Valor acima de três vezes a média disponível.',OPERATION_CHANGED:'A operação foi alterada entre conferências pelo menos duas vezes.',REPEATED_ATTEMPTS:'Há tentativas interrompidas anteriores.',ACTIVE_RESTRICTION:'Restrição interna demonstrativa ativa.',URGENCY:'Você relatou pressão para transferir.',ADVANCE_PAYMENT:'Você relatou pagamento antecipado para liberar valores.',IDENTITY_DOUBT:'Você não confirmou a identidade.',IGNORE_WARNINGS:'Você relatou instruções para ignorar alertas.'}[code]))] };
}
function decidePixPolicy(evaluation, {triageRequired=false, answered=false, uncertain=false}={}) {
    const has=code=>evaluation.codes.includes(code);
    const contextualBlock=(has('ADVANCE_PAYMENT') && (has('URGENCY')||has('IDENTITY_DOUBT')||has('IGNORE_WARNINGS'))) || (has('IDENTITY_DOUBT')&&has('IGNORE_WARNINGS'));
    const legacyBlock=evaluation.legacy.level==='elevated';
    const action=legacyBlock||contextualBlock ? 'BLOCKED' : answered&&uncertain ? 'INCONCLUSIVE' :
        (!answered&&(triageRequired||evaluation.legacy.level==='moderate'||has('ATYPICAL_AMOUNT')||has('REPEATED_ATTEMPTS')||has('OPERATION_CHANGED'))) ||
        ['URGENCY','ADVANCE_PAYMENT','IDENTITY_DOUBT','IGNORE_WARNINGS'].some(has) ? 'NEEDS_VERIFICATION' : 'ALLOWED';
    return {version:pixPolicyRules.version,action,contextualBlock,legacyBlock,codes:[...evaluation.codes],
        justification: action==='BLOCKED'?'Operação demonstrativa interrompida pelos indícios combinados ou restrição interna. Isso não prova fraude.':action==='INCONCLUSIVE'?'As respostas não permitem concluir a verificação. Reconsidere ou confira por outro canal.':action==='NEEDS_VERIFICATION'?'Confira o contexto e reconheça os alertas antes de prosseguir.':'Sem motivo para intervenção adicional nesta simulação. Isso não garante segurança.'};
}
