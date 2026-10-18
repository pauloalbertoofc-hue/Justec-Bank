import { freezeDeep } from './risk-engine.js';
// O rótulo de falso positivo é educativo e não é fornecido ao motor.
export const SCENARIOS = freezeDeep([
    { id: 'DEMO-LOW', title: 'Baixo risco', indicators: [], expected: { score: 0, classification: 'low', action: 'allow_simulation' } },
    { id: 'DEMO-MODERATE', title: 'Risco moderado', indicators: ['R01','R02','R03'], expected: { score: 40, classification: 'moderate', action: 'require_additional_confirmation' } },
    { id: 'DEMO-HIGH', title: 'Risco elevado', indicators: ['R01','R03','R04','R05','R06'], expected: { score: 90, classification: 'high', action: 'interrupt_simulation' } },
    { id: 'DEMO-ALL', title: 'Todos os indicadores', indicators: ['R01','R02','R03','R04','R05','R06'], expected: { score: 100, classification: 'high', action: 'interrupt_simulation' } },
    { id: 'DEMO-FALSE-POSITIVE', title: 'Falso positivo conhecido no cenário', indicators: ['R01','R03','R06'], educationalOutcome: 'legitimate', expected: { score: 60, classification: 'high', action: 'interrupt_simulation' }, reviewExample: { outcome: 'withdrawn', reason: 'Esclarecimentos fictícios mostram que os indicadores não representavam fraude.' } }
]);
