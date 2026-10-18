import { evaluateRisk, assertKeys, freezeDeep } from './risk-engine.js';
import { decideAction } from './policy-engine.js';
export const AUDIT_VERSION = 'justec-guard-audit/0.2.0';
function identifier(value) {
    if (typeof value !== 'string' || !/^DEMO-[A-Z0-9-]{1,80}$/.test(value)) throw new TypeError('Use identificador fictício DEMO- em maiúsculas.');
    return value;
}
function timestamp(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
        !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) throw new TypeError('Informe data ISO UTC válida com milissegundos.');
    return value;
}
/** ID e data são injetados pelo chamador: nenhum relógio, aleatoriedade ou persistência. */
export function createEvaluationRecord(input, metadata) {
    assertKeys(metadata, ['evaluationId', 'transactionId', 'timestamp'], 'Metadados');
    const evaluation = evaluateRisk(input);
    const decision = decideAction(evaluation);
    return freezeDeep({ auditVersion: AUDIT_VERSION, simulation: true,
        evaluationId: identifier(metadata.evaluationId), transactionId: identifier(metadata.transactionId), timestamp: timestamp(metadata.timestamp),
        riskLevel: evaluation.classification, indicators: evaluation.indicators.map(item => item.id),
        policyVersion: decision.policyVersion, decision: decision.action, reasons: [...evaluation.justifications],
        original: { input: evaluation.indicators.map(item => item.id), evaluation, decision }, reviews: [] });
}
function normalizedReview(review, earliest) {
    assertKeys(review, ['id', 'reviewedAt', 'reviewerId', 'outcome', 'reason'], 'Revisão');
    const reviewedAt = timestamp(review.reviewedAt);
    if (reviewedAt < earliest) throw new TypeError('Revisão não pode anteceder a avaliação ou revisão anterior.');
    if (!['maintained', 'withdrawn'].includes(review.outcome)) throw new TypeError('Resultado de revisão inválido.');
    if (typeof review.reason !== 'string' || review.reason.trim().length < 10 || review.reason.trim().length > 1000) throw new TypeError('Justificativa fictícia deve conter 10 a 1000 caracteres.');
    return { id: identifier(review.id), reviewedAt, reviewerId: identifier(review.reviewerId), outcome: review.outcome, reason: review.reason.trim() };
}
function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
    return value;
}
function same(a, b) { return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b)); }
function validateRecord(record) {
    assertKeys(record, ['auditVersion', 'simulation', 'evaluationId', 'transactionId', 'timestamp', 'riskLevel', 'indicators', 'policyVersion', 'decision', 'reasons', 'original', 'reviews'], 'Registro');
    assertKeys(record.original, ['input', 'evaluation', 'decision'], 'Decisão original');
    const rebuilt = createEvaluationRecord(record.original.input, { evaluationId: record.evaluationId, transactionId: record.transactionId, timestamp: record.timestamp });
    const { reviews: ignoredReviews, ...snapshot } = record;
    const { reviews: emptyReviews, ...expectedSnapshot } = rebuilt;
    if (!same(snapshot, expectedSnapshot) || !Array.isArray(record.reviews)) throw new TypeError('Registro inconsistente.');
    let earliest = record.timestamp;
    const ids = new Set();
    const reviews = Array.from(record.reviews).map(review => {
        const validated = normalizedReview(review, earliest);
        if (ids.has(validated.id)) throw new TypeError('Identificador de revisão duplicado.');
        ids.add(validated.id); earliest = validated.reviewedAt;
        return validated;
    });
    return { ...rebuilt, reviews };
}
/** Append funcional: devolve outro registro; original e revisões anteriores não são alterados. */
export function appendReview(record, review) {
    const validated = validateRecord(record);
    const next = normalizedReview(review, validated.reviews.at(-1)?.reviewedAt || validated.timestamp);
    if (validated.reviews.some(item => item.id === next.id)) throw new TypeError('Identificador de revisão duplicado.');
    return freezeDeep({ ...validated, reviews: [...validated.reviews, next] });
}
export function getReviewStatus(record) {
    const validated = validateRecord(record);
    return freezeDeep({ originalAction: validated.original.decision.action,
        latestReviewOutcome: validated.reviews.at(-1)?.outcome ?? 'not_reviewed',
        reviewCount: validated.reviews.length,
        disclaimer: 'Revisão educativa. A decisão original permanece registrada; nenhuma medida real é executada.' });
}
