# JUSTEC Guard — Etapa 6: Especificação experimental do motor de risco

Data: 17/10/2026
Status: proposta técnica para implementação e testes; não validada empiricamente.

## Objetivo
Construir motor demonstrativo de avaliação de risco Pix, separado da política de intervenção e da interface, sem conexão com instituições reais.

## Indicadores experimentais
| Código | Indicador | Peso |
|---|---|---:|
| R01 | Chave recentemente cadastrada | 10 |
| R02 | Destinatário sem relacionamento prévio | 10 |
| R03 | Valor fora do padrão | 20 |
| R04 | Dispositivo incomum | 15 |
| R05 | Múltiplas tentativas recentes | 15 |
| R06 | Alerta interno fictício | 30 |

Pontuação: soma dos pesos dos indicadores ativos, limitada a 100. Estes pesos não são parâmetros oficiais nem probabilidades de fraude.

## Faixas provisórias
- 0 a 29: baixo risco — permitir prosseguimento simulado.
- 30 a 59: risco moderado — verificação adicional demonstrativa.
- 60 a 100: risco elevado — interrupção simulada da operação, sujeita a revisão.

## Arquitetura de implementação
- `js/guard/risk-engine.js`: função pura `evaluateRisk(indicators)` retorna score, nível, indicadores acionados e versão das regras.
- `js/guard/policy-engine.js`: função pura `decideAction(assessment)` retorna ação e justificativa.
- `js/guard/scenarios.js`: casos fictícios de baixo, médio, alto risco e falso positivo.
- `js/guard/audit.js`: registro local demonstrativo das avaliações e revisões, sem dados reais.
- Integração futura com o fluxo Pix por interface de serviço, sem comunicação bancária nesta etapa.

## Casos de teste mínimos
1. Nenhum indicador: 0, baixo, prosseguir.
2. R01+R02+R03: 40, moderado, verificação.
3. R01+R03+R04+R05+R06: 90, elevado, interromper.
4. Todos os indicadores: 100, elevado, interromper.
5. Indicador inválido: rejeição controlada, sem pontuação silenciosa.
6. Falso positivo: restrição original preservada na auditoria; revisão registra decisão separada.
7. Nenhuma operação interrompida altera o saldo ou gera comprovante de Pix concluído.

## Cuidados e limitações
A análise é baseada em cenários fictícios, não em consultas ao DICT, Bacen ou dados reais. Risco não significa fraude comprovada. Chave Pix, conta e transação são objetos distintos. O modelo não executa bloqueios externos. Os limiares precisam de testes e avaliação jurídica antes de qualquer aplicação real. Não coletar CPF, senhas, biometria ou dados bancários reais.

## Próxima etapa
Implementar e executar testes automatizados das funções puras; integrar somente após aprovação dos testes. Atualizar o Relatório-Mestre local sem apagar o histórico.
