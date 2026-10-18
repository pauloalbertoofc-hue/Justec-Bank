import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateRisk, INDICATOR_RULES, RULES_VERSION, validateEvaluation, freezeDeep } from '../js/guard/risk-engine.js';
import { decideAction, POLICY_VERSION } from '../js/guard/policy-engine.js';
import { SCENARIOS } from '../js/guard/scenarios.js';
import { createEvaluationRecord, appendReview, getReviewStatus } from '../js/guard/audit.js';
const input = indicators => indicators;
const metadata = { evaluationId: 'DEMO-EVAL-1', transactionId: 'DEMO-TX-1', timestamp: '2026-10-17T12:00:00.000Z' };
const review = (overrides = {}) => ({ id: 'DEMO-REVIEW-1', reviewedAt: '2026-10-17T13:00:00.000Z', reviewerId: 'DEMO-ANALYST', outcome: 'withdrawn', reason: 'Esclarecimento fictício demonstra falso positivo.', ...overrides });
for (const scenario of SCENARIOS) {
    test(`Cenário ${scenario.id}: pontuação, classificação e decisão esperadas`, () => {
        const result = evaluateRisk(scenario.indicators);
        const policy = decideAction(result);
        assert.equal(result.score, scenario.expected.score);
        assert.equal(result.classification, scenario.expected.classification);
        assert.equal(policy.action, scenario.expected.action);
        assert.equal(result.rulesVersion, RULES_VERSION);
        assert.equal(policy.policyVersion, POLICY_VERSION);
        assert.equal(policy.requiresAdditionalConfirmation, result.classification === 'moderate');
        assert.equal(policy.reviewAvailable, result.classification === 'high');
    });
}
for (const [indicators, score, classification] of [
    [['R03'],20,'low'], [['R01','R02','R03'],40,'moderate'],
    [['R01','R03','R04','R05','R06'],90,'high'],
    [['R01','R02','R03','R04','R05','R06'],100,'high'],
    [['R01','R03'],30,'moderate'], [['R03','R06'],50,'moderate'],
    [['R01','R03','R06'],60,'high']
]) {
    test(`Pontuação ${score}: ${classification}`, () => {
        const result = evaluateRisk(input(indicators));
        assert.equal(result.score, score); assert.equal(result.classification, classification);
    });
}
test('Nenhum indicador isolado implica interrupção', () => {
    for (const rule of INDICATOR_RULES) assert.notEqual(decideAction(evaluateRisk(input([rule.id]))).action, 'interrupt_simulation');
});
test('Duplicatas são normalizadas e ordem de entrada não muda resultado', () => {
    const result = evaluateRisk(input(['R06','R01','R01']));
    assert.deepEqual(result, evaluateRisk(input(['R01','R06'])));
    assert.equal(result.score, 40); assert.equal(result.indicators.length, 2);
});
test('Não muta entrada congelada e não compartilha arrays de entrada', () => {
    const source = Object.freeze(['R01']);
    const before = JSON.stringify(source); const result = evaluateRisk(source);
    assert.equal(JSON.stringify(source),before);
    assert(Object.isFrozen(result)); assert(Object.isFrozen(result.indicators[0]));
    assert.throws(() => { result.indicators[0].weight = 999; }, TypeError);
    assert.equal(evaluateRisk(input(['R01'])).score,10);
});
test('Justificativas acompanham os indicadores e explicam a ausência deles', () => {
    assert.match(evaluateRisk(input([])).justifications[0], /Nenhum/);
    const result = evaluateRisk(input(['R01','R05']));
    assert.deepEqual(result.justifications, result.indicators.map(item => item.justification));
    assert.match(result.disclaimer,/não é comprovação de fraude/);
});
for (const [name, value] of [
    ['null',null], ['objeto',{}], ['string','R01'], ['sem modo fictício',{indicators:[]}],
    ['modo real',{simulation:false,indicators:[]}], ['lista textual',{simulation:true,indicators:'R01'}],
    ['indicador desconhecido',input(['unknown'])], ['valor numérico',input([1])],
    ['indicador null',input([null])], ['lista esparsa',input(Array(1))],
    ['peso fornecido pelo chamador',{simulation:true,indicators:[],score:999}]
]) test(`Rejeita entrada inválida: ${name}`, () => assert.throws(() => evaluateRisk(value), TypeError));
test('Política rejeita avaliação adulterada e versão desconhecida', () => {
    const result=evaluateRisk(input(['R01']));
    for(const patch of [{score:0},{classification:'low',score:NaN},{rulesVersion:'v99'}, {simulation:false}, {justifications:[]}, {indicators:[{id:'R01',weight:999,justification:'Falso'}]}]) {
        assert.throws(()=>decideAction({...result,...patch}),TypeError);
    }
    assert.throws(()=>decideAction(null),TypeError);
    assert.throws(()=>validateEvaluation({...result, indicators:[...result.indicators,...result.indicators]}),TypeError);
});
test('Cenários e regras não podem ser alterados por uma avaliação', () => {
    const before=JSON.stringify(SCENARIOS);
    SCENARIOS.forEach(s=>decideAction(evaluateRisk(s.indicators)));
    assert.equal(JSON.stringify(SCENARIOS),before);
    assert.throws(()=>SCENARIOS[0].indicators.push('R01'),TypeError);
});
test('Falso positivo é classificado pelo risco antes de receber revisão', () => {
    const scenario=SCENARIOS.find(item=>item.educationalOutcome==='legitimate');
    const original=createEvaluationRecord(scenario.indicators, metadata);
    assert.equal(original.original.decision.action,'interrupt_simulation');
    const updated=appendReview(original,review());
    assert.deepEqual(updated.original,original.original);
    assert.equal(original.reviews.length,0);
    assert.equal(updated.reviews.length,1);
    assert.equal(getReviewStatus(updated).latestReviewOutcome,'withdrawn');
    assert.equal(getReviewStatus(updated).originalAction,'interrupt_simulation');
});
test('Auditoria é determinística, profundamente imutável e serializável', () => {
    const a=createEvaluationRecord(input(['R06','R01']),metadata);
    const b=createEvaluationRecord(input(['R01','R06']),metadata);
    assert.deepEqual(a,b);
    assert.equal(getReviewStatus(a).latestReviewOutcome,'not_reviewed');
    assert.throws(()=>{a.original.decision.action='allow_simulation';},TypeError);
    const copy=JSON.parse(JSON.stringify(a));
    assert.deepEqual(appendReview(copy,review()).original,a.original);
    assert.deepEqual(copy,JSON.parse(JSON.stringify(a)));
});
test('Múltiplas revisões preservam decisão original e todas as revisões anteriores', () => {
    const original=createEvaluationRecord(input(['R01','R06']),metadata);
    const first=appendReview(original,review({outcome:'maintained'}));
    const second=appendReview(first,review({id:'DEMO-REVIEW-2',reviewedAt:'2026-10-17T14:00:00.000Z'}));
    assert.equal(first.reviews.length,1); assert.equal(second.reviews.length,2);
    assert.deepEqual(second.reviews[0],first.reviews[0]);
    assert.equal(getReviewStatus(second).reviewCount,2);
    assert.equal(second.original.evaluation.score,40);
});
test('Auditoria rejeita metadados e datas inválidos', () => {
    for(const meta of [{...metadata,evaluationId:'real-123'},{...metadata,timestamp:'ontem'},{...metadata,timestamp:'2026-02-31T12:00:00.000Z'},{...metadata,extra:true}]) assert.throws(()=>createEvaluationRecord(input([]),meta),TypeError);
});
test('Auditoria rejeita revisão inválida, retroativa ou duplicada', () => {
    const record=createEvaluationRecord(input([]),metadata);
    for(const patch of [{reason:'curto'},{reason:'x'.repeat(1001)},{outcome:'approved-real'},{reviewerId:'user'},{reviewedAt:'2026-10-17T11:00:00.000Z'}]) assert.throws(()=>appendReview(record,review(patch)),TypeError);
    const updated=appendReview(record,review());
    assert.throws(()=>appendReview(updated,review()),TypeError);
    assert.throws(()=>appendReview(updated,review({id:'DEMO-REVIEW-2',reviewedAt:'2026-10-17T12:30:00.000Z'})),TypeError);
});
test('Auditoria rejeita decisão original adulterada', () => {
    const record=JSON.parse(JSON.stringify(createEvaluationRecord(input(['R01']),metadata)));
    record.original.decision.action='interrupt_simulation';
    assert.throws(()=>appendReview(record,review()),TypeError);
});

test('Snapshot imutável não modifica nem congela objetos do chamador', () => {
    const source = { nested: { values: ['R01'] } };
    const snapshot = freezeDeep(source);
    assert.equal(Object.isFrozen(source), false);
    assert.equal(Object.isFrozen(source.nested.values), false);
    source.nested.values.push('R02');
    assert.deepEqual(snapshot.nested.values, ['R01']);
    assert(Object.isFrozen(snapshot.nested.values));
});
test('Tabela da especificação: códigos e pesos exatos, limitada a 100', () => {
    assert.deepEqual(INDICATOR_RULES.map(({id,weight})=>[id,weight]), [['R01',10],['R02',10],['R03',20],['R04',15],['R05',15],['R06',30]]);
    assert.match(INDICATOR_RULES[3].justification,/Dispositivo incomum/);
    const result=evaluateRisk(['R01','R02','R03','R04','R05','R06','R06']);
    assert.equal(result.score,100);
    assert.equal(result.indicators.length,6);
});
test('Registro contém os dados mínimos de arquitetura e preserva os vínculos', () => {
    const record=createEvaluationRecord(['R01','R03','R06'],metadata);
    for(const key of ['evaluationId','transactionId','timestamp','riskLevel','indicators','policyVersion','decision','reasons','simulation']) assert(Object.hasOwn(record,key),key);
    assert.equal(record.transactionId,'DEMO-TX-1');
    assert.equal(record.simulation,true);
    const reviewed=appendReview(record,review());
    assert.equal(reviewed.decision,'interrupt_simulation');
    assert.equal(reviewed.original.evaluation.score,60);
    const edited=JSON.parse(JSON.stringify(record)); edited.decision='allow_simulation';
    assert.throws(()=>appendReview(edited,review()),TypeError);
});
test('Motor isolado não acessa saldo, DOM ou emissão de comprovantes', () => {
    const names=['bankState','document','localStorage'];
    const previous=names.map(name=>Object.getOwnPropertyDescriptor(globalThis,name));
    try {
        for(const name of names) Object.defineProperty(globalThis,name,{configurable:true,get(){throw new Error('Acesso indevido ao fluxo bancário');}});
        const assessment=evaluateRisk(['R01','R03','R04','R05','R06']);
        assert.equal(decideAction(assessment).action,'interrupt_simulation');
        const record=createEvaluationRecord(assessment.indicators.map(i=>i.id),metadata);
        assert.equal(record.original.decision.action,'interrupt_simulation');
    } finally {
        names.forEach((name,i)=>previous[i]?Object.defineProperty(globalThis,name,previous[i]):delete globalThis[name]);
    }
});
