import { validateEvaluation, freezeDeep } from './risk-engine.js';
export const POLICY_VERSION = 'justec-guard-policy/0.2.0';
const POLICIES = Object.freeze({
    low: ['allow_simulation', false, 'O cenário pode prosseguir com confirmação demonstrativa.'],
    moderate: ['require_additional_confirmation', true, 'Exibir alerta educativo e exigir confirmação adicional.'],
    high: ['interrupt_simulation', false, 'Interromper somente a operação demonstrativa e oferecer revisão.']
});
/** Não executa ações, bloqueios, autenticação ou alterações na interface. */
export function decideAction(evaluation) {
    const validated = validateEvaluation(evaluation);
    const [action, requiresAdditionalConfirmation, justification] = POLICIES[validated.classification];
    return freezeDeep({ simulation: true, rulesVersion: validated.rulesVersion, policyVersion: POLICY_VERSION,
        score: validated.score, classification: validated.classification, action,
        requiresAdditionalConfirmation, reviewAvailable: validated.classification === 'high', justification,
        disclaimer: 'Política demonstrativa. Não bloqueia chaves no DICT, contas ou operações reais.' });
}
