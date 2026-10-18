# JUSTEC Guard — motor experimental da Etapa 6

Implementação isolada de `Documentação/JUSTEC_Guard_Etapa_6_Especificacao.md`, versão de regras `justec-guard-risk/0.2.0`. Sem integração ao Pix, DOM, saldo, rede ou persistência. A versão provisória 0.1.0, anterior ao recebimento da especificação, foi substituída.

No terminal do VS Code, na raiz, com Node.js 20 ou superior:

```sh
node js/guard/demo.js
node --test tests/guard.test.mjs
```

Não requer npm install, Live Server nem framework. O package.json desta pasta apenas habilita ES modules localmente.

```js
// Exemplo em um arquivo .mjs na raiz do projeto.
import { evaluateRisk } from './js/guard/risk-engine.js';
import { decideAction } from './js/guard/policy-engine.js';
const assessment = evaluateRisk(['R01', 'R02', 'R03']);
console.log(assessment); // score: 40, classification: moderate
console.log(decideAction(assessment)); // require_additional_confirmation
```

| Código | Indicador fictício | Peso |
| --- | --- | ---: |
| R01 | Chave recentemente cadastrada | 10 |
| R02 | Destinatário sem relacionamento prévio | 10 |
| R03 | Valor fora do padrão | 20 |
| R04 | Dispositivo incomum | 15 |
| R05 | Múltiplas tentativas recentes | 15 |
| R06 | Alerta interno fictício | 30 |

Soma limitada a 100. De 0 a 29: low / allow_simulation; de 30 a 59: moderate / require_additional_confirmation; de 60 a 100: high / interrupt_simulation. Pontuação não é probabilidade nem comprovação de fraude. Nenhum indicador individual provoca interrupção. Os indicadores já devem ter sido selecionados pelo cenário; o módulo não consulta dispositivos, chaves ou dados transacionais reais.

Entrada: array de códigos. Duplicatas são deduplicadas; desconhecidos, tipos inválidos e listas esparsas são rejeitados. O resultado inclui score, classification, indicators (id, weight, justification), justifications, rulesVersion, simulation: true e disclaimer. A política valida consistência/versão e descreve a ação, sem executá-la. A ordem de entrada não altera o resultado. Saídas são cópias imutáveis; as entradas não são alteradas nem congeladas.

`scenarios.js` contém baixo (0), moderado (40), elevado (90), todos (100) e falso positivo (60). O rótulo “legítimo” é educativo, não uma entrada do motor.

Auditoria local demonstrativa em memória:

```js
import { createEvaluationRecord, appendReview, getReviewStatus } from './js/guard/audit.js';
const original = createEvaluationRecord(['R01', 'R03', 'R06'], {
    evaluationId: 'DEMO-EVAL-1',
    transactionId: 'DEMO-TX-1',
    timestamp: '2026-10-17T12:00:00.000Z'
});
const reviewed = appendReview(original, {
    id: 'DEMO-REVIEW-1',
    reviewedAt: '2026-10-17T13:00:00.000Z',
    reviewerId: 'DEMO-ANALYST',
    outcome: 'withdrawn', // ou maintained
    reason: 'Esclarecimentos fictícios mostram um falso positivo.'
});
console.log(getReviewStatus(reviewed));
// originalAction: interrupt_simulation; latestReviewOutcome: withdrawn
```

O registro contém evaluationId, transactionId, timestamp, riskLevel, indicators, policyVersion, decision, reasons e simulation: true, além dos snapshots originais, versões e revisões. IDs/datas são fornecidos pelo chamador, sem relógio ou aleatoriedade. Datas devem estar em ISO UTC com milissegundos; revisões não podem retroceder no tempo nem repetir ID. O resultado de revisão não altera pontuação/decisão originais, não debita saldo e não gera comprovante financeiro.

A auditoria é um modelo serializável local, não um banco de dados inviolável. Não há assinatura digital, autenticação de revisores, escrita em disco automática ou garantia criptográfica contra reconstrução de históricos. Versões desconhecidas são rejeitadas; migração de históricos 0.1.0 não está implementada. Pesos/limiares são experimentais e não validados empiricamente. Não há bloqueio no DICT, consultas ao Bacen, operação bancária ou coleta de dados reais. A integração ao Pix permanece fora desta etapa.
