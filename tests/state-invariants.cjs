const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const stateFile = process.env.JUSTEC_STATE_FILE || path.join(root, 'js/state.js');
function fixture() {
    const context = vm.createContext({});
    vm.runInContext(fs.readFileSync(path.join(root, 'js/transactions.js'), 'utf8'), context);
    vm.runInContext(fs.readFileSync(stateFile, 'utf8'), context);
    vm.runInContext(`
        bankState.sequence = 7;
        bankState.attempts.push({id:'ATTEMPT-OLD',recipientId:'demo-other',amount:10,reasons:['Histórico existente']});
        bankState.restrictions.push({id:'REV-OLD',recipientId:'demo-other',status:'Em análise',history:['Restrição ativa','Revisão solicitada','Em análise']});
        const originalCollections = [bankState.transactions,bankState.attempts,bankState.restrictions];
    `, context);
    return {
        run: source => vm.runInContext(source, context),
        snapshot: () => vm.runInContext('JSON.stringify({bankState,statementScenario})', context),
        checkReferences: () => vm.runInContext('originalCollections.every((value,index)=>value===[bankState.transactions,bankState.attempts,bankState.restrictions][index])', context)
    };
}
function draft(amount = '50', overrides = '') {
    return `({id:'PIX-TEST-1',amount:${amount},recipient:{id:'demo-low',name:'Destinatário Escola A (fictício)'},${overrides}})`;
}
function rejectedWithoutMutation(f, expression) {
    const before = f.snapshot();
    let error;
    try { f.run(`recordApprovedPix(${expression})`); } catch (caught) { error = caught; }
    // Verifica atomicidade mesmo quando o código antigo deixa de lançar erro.
    assert.equal(f.snapshot(), before, 'Entrada rejeitada deve preservar todo o estado e o cenário');
    assert.equal(f.checkReferences(), true, 'Não deve substituir coleções de transações/histórico');
    assert.ok(error, 'Entrada inválida deve produzir rejeição explícita');
}
for (const [label, amount] of [
    ['NaN','NaN'], ['Infinity','Infinity'], ['-Infinity','-Infinity'], ['string numérica',"'50'"],
    ['string brasileira',"'50,00'"], ['null','null'], ['undefined','undefined'], ['boolean','true'],
    ['BigInt','50n'], ['objeto numérico','new Number(50)'], ['zero','0'], ['zero negativo','-0'],
    ['negativo','-0.01'], ['terceira casa decimal','1.001'], ['fração de centavo','0.001'],
    ['erro aritmético não normalizado','0.1 + 0.2'], ['precisão extra perto de inteiro','1.0000000000000002'],
    ['limite seguro de centavos excedido','Number.MAX_SAFE_INTEGER'], ['saldo insuficiente','2480.51']
]) test(`Rejeita ${label} sem alterar saldo, transações, IDs ou históricos`, () => {
    rejectedWithoutMutation(fixture(), draft(amount));
});
for (const [label, expression] of [
    ['rascunho ausente','undefined'], ['rascunho null','null'], ['array','[]'], ['objeto vazio','{}'],
    ['sem id',"({amount:50,recipient:{id:'demo-low',name:'Nome'}})"],
    ['id vazio',draft('50',"id:''")], ['id só espaços',draft('50',"id:'   '")], ['id numérico',draft('50','id:42')],
    ['sem amount',"({id:'PIX-TEST-1',recipient:{id:'demo-low',name:'Nome'}})"],
    ['sem destinatário',"({id:'PIX-TEST-1',amount:50})"], ['destinatário null',draft('50','recipient:null')],
    ['destinatário array',draft('50',"recipient:[]")], ['destinatário sem id',draft('50',"recipient:{name:'Nome'}")],
    ['destinatário sem nome',draft('50',"recipient:{id:'demo-low'}")],
    ['nome vazio',draft('50',"recipient:{id:'demo-low',name:'  '}" )],
    ['nome não textual',draft('50',"recipient:{id:'demo-low',name:99}")],
    ['id destinatário vazio',draft('50',"recipient:{id:' ',name:'Nome'}")]
]) test(`Rejeita contrato incompleto: ${label}`, () => rejectedWithoutMutation(fixture(), expression));
for (const amount of [0.01,0.07,0.1,0.29,1.15,19.99,50,350.35]) {
    test(`Lança valor BRL válido ${amount} com aritmética exata em centavos`, () => {
        const f = fixture();
        const beforeCents = f.run('Math.round(bankState.balance*100)');
        assert.equal(f.run(`recordApprovedPix(${draft(String(amount))})`), 'PIX-TEST-1');
        assert.equal(f.run('Math.round(bankState.balance*100)'), beforeCents-Math.round(amount*100));
        assert.equal(f.run('bankState.transactions.length'),13);
        assert.equal(f.run('bankState.transactions[0].amount'),-amount);
        assert.equal(f.run('bankState.transactions[0].participant.id'),'demo-low');
        assert.equal(f.run('bankState.transactions[0].status'),'completed');
        assert.equal(f.run('bankState.sequence'),7);
        assert.equal(f.run('bankState.attempts.length'),1);
        assert.equal(f.run('bankState.restrictions[0].history.length'),3);
    });
}
test('Aceita esgotar saldo e repetir a mesma operação mesmo com saldo zero', () => {
    const f=fixture(); const expression=draft('2480.50');
    f.run(`recordApprovedPix(${expression})`); assert.equal(f.run('bankState.balance'),0);
    const before=f.snapshot();
    assert.equal(f.run(`recordApprovedPix(${expression})`),'PIX-TEST-1');
    assert.equal(f.snapshot(),before);
    rejectedWithoutMutation(f,draft('0.01',"id:'PIX-TEST-2'"));
});
test('Replay idêntico não debita nem altera o lançamento ou a sequência', () => {
    const f=fixture();f.run(`recordApprovedPix(${draft()})`);const before=f.snapshot();
    for(let i=0;i<3;i++)assert.equal(f.run(`recordApprovedPix(${draft()})`),'PIX-TEST-1');
    assert.equal(f.snapshot(),before);
});
for (const [label, expression] of [
    ['valor divergente',draft('51')],
    ['destinatário divergente',draft('50',"recipient:{id:'demo-other',name:'Destinatário Escola A (fictício)'}")],
    ['nome divergente',draft('50',"recipient:{id:'demo-low',name:'Outro nome'}")],
    ['NaN com ID existente',draft('NaN')],
    ['dados incompletos com ID existente',"({id:'PIX-TEST-1'})"]
]) test(`Rejeita colisão: ${label}`,()=>{const f=fixture();f.run(`recordApprovedPix(${draft()})`);rejectedWithoutMutation(f,expression)});
test('ID de movimentação inicial não pode ser reaproveitado para outro Pix',()=>{
    rejectedWithoutMutation(fixture(),draft('50',"id:'DEMO-01'"));
});
test('Rejeita saldo do estado já inválido sem acrescentar lançamento',()=>{
    const f=fixture();f.run('bankState.openingBalance=NaN');rejectedWithoutMutation(f,draft());
});
test('Entrada congelada é aceita sem mutação e sem compartilhar destinatário',()=>{
    const f=fixture();f.run(`const frozenDraft=Object.freeze({...${draft()},recipient:Object.freeze({id:'demo-low',name:'Destinatário Escola A (fictício)'})});`);
    const before=f.run('JSON.stringify(frozenDraft)');f.run('recordApprovedPix(frozenDraft)');
    assert.equal(f.run('JSON.stringify(frozenDraft)'),before);
    assert.equal(f.run('bankState.transactions[0].participant===frozenDraft.recipient'),false);
});
test('Destinatário do lançamento é um snapshot, sem vínculo mutável com rascunho',()=>{
    const f=fixture();f.run(`const mutableDraft=${draft()};recordApprovedPix(mutableDraft);mutableDraft.recipient.id='changed';mutableDraft.recipient.name='Alterado';mutableDraft.amount=999;`);
    assert.equal(f.run('bankState.transactions[0].participant.id'),'demo-low');
    assert.equal(f.run('bankState.transactions[0].participant.name'),'Destinatário Escola A (fictício)');
    assert.equal(f.run('bankState.transactions[0].amount'),-50);
});
test('Acessor não executa código durante validação de campos obrigatórios',()=>{
    const f=fixture();f.run("let getterCalls=0;const accessorDraft={id:'PIX-TEST-1',get amount(){getterCalls++;bankState.sequence++;return 50},recipient:{id:'demo-low',name:'Nome'}};");
    rejectedWithoutMutation(f,'accessorDraft');assert.equal(f.run('getterCalls'),0);
});
test('Rejeição não impede um lançamento válido posterior',()=>{
    const f=fixture();rejectedWithoutMutation(f,draft('NaN'));
    assert.equal(f.run(`recordApprovedPix(${draft()})`),'PIX-TEST-1');
    assert.equal(f.run('bankState.balance'),2430.50);
    assert.equal(f.run('bankState.transactions.length'),13);
    assert.equal(f.run('bankState.sequence'),7);
});
test('Lançamentos sucessivos preservam os centavos e o saldo finito',()=>{
    const f=fixture();
    for(const [index,amount] of [0.1,0.2,0.29].entries())f.run(`recordApprovedPix(${draft(String(amount),`id:'PIX-CENTS-${index}'`)})`);
    assert.equal(f.run('bankState.balance'),2479.91);
    assert.equal(f.run('Number.isFinite(bankState.balance)'),true);
    assert.equal(f.run('bankState.transactions.length'),15);
});
