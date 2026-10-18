# JUSTEC Guard — Documento de Requisitos e Arquitetura v1.0

Data: 17/10/2026
Status: proposta aprovada conceitualmente; implementação não iniciada nesta etapa.

## Decisão arquitetural
Modelo híbrido: proteção interna demonstrativa como primeira entrega; interoperabilidade futura via adaptadores, sem integração financeira real no protótipo.

## Escopo
O JUSTEC Bank apresenta saldo, extrato e fluxo Pix fictícios. O JUSTEC Guard avalia cenários de risco demonstrativos, recomenda ações, registra decisões e permite revisão simulada. Não bloqueia chaves no DICT nem contas de instituições externas.

## Componentes
1. Interface bancária: telas, navegação, mensagens e confirmação.
2. Estado transacional: saldo fictício, operações aprovadas e tentativas interrompidas.
3. Motor de risco: indicadores, pontuação explicável e limites de confiança.
4. Motor de políticas: mapeia avaliações para permitir, solicitar verificação ou interromper operação.
5. Auditoria: histórico imutável em nível lógico de avaliações, decisões, motivos e revisões.
6. Central de revisão: contestação de restrições internas e simulação de falsos positivos.
7. Porta de interoperabilidade: interface abstrata, adaptadores simulados, futura integração apenas autorizada.

## Requisitos funcionais
- JG-001: avaliar operação antes da confirmação.
- JG-002: identificar indicadores de risco fictícios.
- JG-003: fornecer nível de risco e justificativa.
- JG-004: interromper operações de alto risco em ambiente simulado.
- JG-005: registrar avaliação, decisão e justificativas em auditoria.
- JG-006: permitir revisão de restrições internas.
- JG-007: demonstrar reversão de falso positivo.
- JG-008: definir contratos de integração independentes da interface.
- JG-009: considerar integrações reais apenas em fase futura autorizada.

## Requisitos não funcionais
- Operação no VS Code com Live Server, sem backend na primeira fase.
- Identificação permanente do ambiente demonstrativo.
- Dados fictícios; não solicitar credenciais ou biometria reais.
- Código modular, com testes determinísticos e cenários reproduzíveis.
- Acessibilidade, mensagens claras e navegação responsiva.
- Nenhuma afirmação de consulta real ao Banco Central ou a bases bancárias.

## Fluxo proposto
1. Usuário informa destinatário fictício e valor.
2. Validação de dados e saldo.
3. Motor de risco avalia indicadores demonstrativos.
4. Motor de políticas escolhe permitir, verificar ou interromper.
5. Interface apresenta decisão e justificativa apropriada.
6. Operações aprovadas alteram saldo e extrato fictícios; interrompidas não alteram saldo.
7. Auditoria registra a decisão; central de revisão pode registrar contestação e desfecho.

## Dados mínimos de uma avaliação
`evaluationId`, `transactionId`, `timestamp`, `riskLevel`, `indicators`, `policyVersion`, `decision`, `reasons`, `simulation: true`.

## Limites jurídicos e operacionais
- Bloqueio de operação, restrição interna de destinatário e bloqueio oficial de chave Pix são medidas distintas.
- A versão inicial apenas simula restrições internas e interrupções de transações.
- O MED não garante restituição e não equivale a bloqueio universal de chave.
- Normas atuais do Pix, DICT, MED, proteção de dados e decisões automatizadas devem ser verificadas em fontes oficiais antes de afirmações jurídicas definitivas.

## Sequência de implementação
1. Levantamento do código atual e preservação de backup.
2. Definição de dados e cenários fictícios.
3. Implementação isolada do motor de risco e testes.
4. Implementação do motor de políticas e testes.
5. Integração ao fluxo Pix e extrato.
6. Auditoria e central de revisão.
7. Adaptador simulado de interoperabilidade.
8. Revisão jurídica e validação demonstrativa.

## Testes de aceitação propostos
- Baixo risco permite Pix e atualiza extrato/saldo.
- Médio risco solicita verificação adicional.
- Alto risco interrompe Pix sem debitar saldo.
- Saldo insuficiente e valor inválido são rejeitados antes da avaliação.
- Revisão de falso positivo altera estado da restrição sem apagar auditoria.
- Dados e avisos identificam claramente a simulação.

## Registro de progresso
- Etapas anteriores: segundo relato do usuário, HTML/CSS/JS foram separados e os cinco testes da Etapa 2 passaram.
- Etapa atual: modelo híbrido escolhido e requisitos iniciais especificados.
- Não foram executados testes de implementação nesta etapa.
