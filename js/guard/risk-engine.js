/** Motor experimental isolado. Indicadores fictícios não comprovam fraude. */
export const RULES_VERSION = 'justec-guard-risk/0.2.0';
export const THRESHOLDS = Object.freeze({ moderate: 30, high: 60 });
export const INDICATOR_RULES = Object.freeze([
    ['R01', 10, 'Chave recentemente cadastrada no cenário fictício.'],
    ['R02', 10, 'Destinatário sem relacionamento prévio no cenário fictício.'],
    ['R03', 20, 'Valor fora do padrão demonstrativo.'],
    ['R04', 15, 'Dispositivo incomum no cenário fictício.'],
    ['R05', 15, 'Múltiplas tentativas recentes no cenário fictício.'],
    ['R06', 30, 'Alerta interno exclusivamente fictício.']
].map(([id, weight, justification]) => Object.freeze({ id, weight, justification })));

export function assertPlainObject(value, label) {
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
        throw new TypeError(`${label} deve ser um objeto simples.`);
    }
}
export function assertKeys(value, keys, label) {
    assertPlainObject(value, label);
    if (Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) {
        throw new TypeError(`${label}: campos ausentes ou desconhecidos.`);
    }
}
// Copia antes de congelar: nem mesmo o congelamento afeta objetos do chamador.
export function freezeDeep(value) {
    if (!value || typeof value !== 'object') return value;
    const copy = Array.isArray(value) ? value.map(freezeDeep) :
        Object.fromEntries(Object.entries(value).map(([key, item]) => [key, freezeDeep(item)]));
    return Object.freeze(copy);
}

/** Entrada: códigos R01–R06 em string[]. Dados fictícios, sem estado ou IO. */
export function evaluateRisk(input) {
    if (!Array.isArray(input)) throw new TypeError('indicators deve ser uma lista de códigos fictícios R01–R06.');
    const known = new Set(INDICATOR_RULES.map(rule => rule.id));
    // Array.from inclui lacunas como undefined, impedindo arrays esparsos inválidos.
    const supplied = Array.from(input);
    if (supplied.some(id => typeof id !== 'string' || !known.has(id))) {
        throw new TypeError('Indicador desconhecido ou inválido.');
    }
    const unique = new Set(supplied);
    const indicators = INDICATOR_RULES.filter(rule => unique.has(rule.id)).map(rule => ({ ...rule }));
    const score = Math.min(100, indicators.reduce((sum, rule) => sum + rule.weight, 0));
    const classification = score >= THRESHOLDS.high ? 'high' : score >= THRESHOLDS.moderate ? 'moderate' : 'low';
    return freezeDeep({
        simulation: true, rulesVersion: RULES_VERSION, score, classification, indicators,
        justifications: indicators.length ? indicators.map(rule => rule.justification) : ['Nenhum indicador fictício acionado.'],
        disclaimer: 'Avaliação experimental de dados fictícios. Pontuação não é comprovação de fraude.'
    });
}

/** Reconstitui a avaliação para rejeitar pontuação, versão ou motivos adulterados. */
export function validateEvaluation(evaluation) {
    assertKeys(evaluation, ['simulation', 'rulesVersion', 'score', 'classification', 'indicators', 'justifications', 'disclaimer'], 'Avaliação');
    if (!Array.isArray(evaluation.indicators)) throw new TypeError('Indicadores da avaliação inválidos.');
    const ids = evaluation.indicators.map(indicator => {
        assertKeys(indicator, ['id', 'weight', 'justification'], 'Indicador avaliado');
        return indicator.id;
    });
    if (new Set(ids).size !== ids.length) throw new TypeError('Avaliação contém indicadores duplicados.');
    const expected = evaluateRisk(ids);
    if (evaluation.simulation !== true || evaluation.rulesVersion !== expected.rulesVersion ||
        evaluation.score !== expected.score || evaluation.classification !== expected.classification ||
        evaluation.disclaimer !== expected.disclaimer ||
        JSON.stringify(evaluation.justifications) !== JSON.stringify(expected.justifications) ||
        evaluation.indicators.some((indicator, index) => Object.keys(expected.indicators[index]).some(key => indicator[key] !== expected.indicators[index][key]))) {
        throw new TypeError('Avaliação inconsistente ou versão de regras incompatível.');
    }
    return expected;
}
