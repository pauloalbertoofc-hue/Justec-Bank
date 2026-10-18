// Único arquivo executável: imprime resultados; os módulos importados são puros.
import { evaluateRisk } from './risk-engine.js';
import { decideAction } from './policy-engine.js';
import { SCENARIOS } from './scenarios.js';
import { createEvaluationRecord, appendReview, getReviewStatus } from './audit.js';
for (const scenario of SCENARIOS) {
    const evaluation = evaluateRisk(scenario.indicators);
    console.log(JSON.stringify({ scenario: scenario.id, evaluation, policy: decideAction(evaluation) }, null, 2));
}
const scenario = SCENARIOS.find(item => item.id === 'DEMO-FALSE-POSITIVE');
const original = createEvaluationRecord(scenario.indicators, { evaluationId: scenario.id, transactionId: 'DEMO-TX-1', timestamp: '2026-10-17T12:00:00.000Z' });
const reviewed = appendReview(original, { id: 'DEMO-REVIEW-1', reviewerId: 'DEMO-ANALYST', reviewedAt: '2026-10-17T13:00:00.000Z', ...scenario.reviewExample });
console.log(JSON.stringify({ auditExample: reviewed, status: getReviewStatus(reviewed) }, null, 2));
