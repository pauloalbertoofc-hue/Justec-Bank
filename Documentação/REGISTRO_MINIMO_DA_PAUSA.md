# JUSTEC — Registro mínimo de abertura e saída da pausa

**Estado atualizado:** esta etapa foi integrada e publicada no Render. [Revisão e evidência externa](REVISAO_INTEGRADA_PAINEL_PESQUISA.md). As referências abaixo à branch local e à ausência de publicação descrevem a preparação original da etapa.

## Finalidade e estado

Distinguir duração configurada de sinais observados no navegador, preparando o laboratório para análises futuras. Implementação local na branch `pesquisa-exposicao-da-pausa`, ainda não publicada. Testes exclusivamente com dados fictícios; nenhum estudo com pessoas iniciado.

O registro fica **desativado por padrão**. A equipe autorizada pode marcar sua ativação ao criar uma execução experimental individual ou um par. Nos pares, a mesma opção é aplicada aos dois lados e integra os parâmetros fixos. Não registra o fluxo bancário comum e não altera regras, pesos, espera aplicada ou autorização financeira.

A ativação pela equipe não substitui consentimento, revisão ética ou protocolo aplicável. Antes de envolver pessoas, esses requisitos devem ser tratados com a instituição. A tela da pausa mostra aviso quando o registro está ativo.

## O que é registrado

Cada visita tem um identificador aleatório temporário no navegador. O servidor recebe:

- `opened`: o navegador informa renderização da pausa enquanto o documento está visível.
- Uma ação de encerramento: `continue`, `reconsider`, `leave` (navegação) ou `hidden` (documento ocultado).

São persistidos somente versão do registro, IDs da visita, rascunho, execução e avaliação, evento, referência ao prazo da pausa já conhecido pelo servidor e horários de recebimento da auditoria. O ator e o ambiente usam o vínculo existente da auditoria.

Não são enviados texto livre, digitação, senhas, coordenadas, conteúdo de conversas, dados do destinatário, valor da operação ou horários escolhidos pelo cliente. Não há rastreador externo, heartbeat, armazenamento local ou nova biblioteca. A opção pertence ao retrato congelado da execução, não a um controle livre do participante.

## O que esses sinais não demonstram

São **declarações do navegador**, não comprovação de leitura, atenção, intenção ou prevenção de fraude. Um cliente pode falhar ou informar sinais sem exposição real. A condição de documento visível também não comprova que o conteúdo inteiro esteve no campo de visão.

O intervalo observado é a diferença entre os **recebimentos no servidor**. Inclui latência e processamento, e não é tempo efetivo de leitura. Intervalos incoerentes por relógio retrocedente ficam sem duração, com contador próprio; não são convertidos em zero.

Ao ocultar e reabrir o documento, começa uma nova visita, se a pausa continuar na tela. Várias visitas não são várias pessoas. Não se captura encerramento de aba por `beforeunload` nem se presume que uma última solicitação chegou.

Sem sinal de saída, o registro é incompleto: não significa abandono. Sem qualquer sinal, pode ter havido coleta desativada, navegador oculto, falha de rede ou outra limitação. Não classificar ausência como inexistência de exposição. Reconsideração é um pedido de ação, não prova de cancelamento final; conferir o desfecho da jornada separadamente.

## Integridade e separação do Pix

`POST /api/drafts/:id/pause-observations` exige autenticação, origem, CSRF, vínculo com o ambiente e que o rascunho pertença ao usuário. Só aceita execuções com ativação explícita no retrato original, IDs válidos e eventos do vocabulário fechado. Abertura exige etapa de pausa; encerramento exige abertura anterior. Continuidade não é registrada antes do prazo original do servidor.

Abertura e encerramento usam eventos imutáveis `pause.opened` e `pause.closed` na auditoria existente. Uma transação serializa validação e gravação, evitando duplicação sob concorrência. Repetir o mesmo sinal é idempotente; tentar outro encerramento para a mesma visita retorna conflito. Nova visita deve usar outro identificador. Sem nova tabela ou migração.

O registro de saída pode chegar depois de o rascunho ser concluído ou cancelado: ele permanece relacionado à abertura original. Isso não autoriza uma transferência. A observação não é exigência para autorizar Pix. No navegador, o envio é independente, limitado por timeout e sem repetição automática; falha não trava a operação. Um evento ausente não é reconstruído por suposição.

## Painel e exportação

A área Pesquisa apresenta **Sinais de abertura e saída da pausa**, com aberturas, saídas, registros incompletos, pedidos de continuidade/reconsideração, saídas por navegação, ocultações e intervalo médio entre recebimentos. O painel e a leitura da API continuam restritos à equipe autorizada.

Nos pares, cada lado apresenta ativação e contadores próprios de abertura/saída, sem misturar execuções que compartilham a mesma configuração. A exportação JSON inclui `pauseExposure` com visitas e resumo; `pairs` inclui o resumo de cada lado. O CSV permanece orientado às operações; relacionar `runId` com o JSON para análise detalhada de sinais.

`GET /api/sessions/:id/pause-exposure` retorna o relatório do ambiente experimental e, para um ambiente de origem, das suas execuções. Não se incluem eventos de ambientes sem relação com ele.

## Ajuste de correção descoberto durante a implementação

O motor existente aplica espera de 0 ms no modo exclusivamente comportamental. Esse modo continua disponível para execuções individuais, mas foi removido da criação de pares de duração, assim como o modo sem intervenção. Os pares aceitam educação, contexto e integrado. Isso evita oferecer duas durações configuradas quando o motor aplicaria 0 ms nos dois lados; o motor e seus pesos não foram alterados para acomodar o experimento.

A opção `observePause` é um metadado booleano opcional de configuração, sem participação na pontuação. Ausência significa desativado. Retratos antigos sem essa propriedade continuam repetíveis sem adicionar a propriedade silenciosamente ao retrato original.

## Arquivos e validação

- `server/pause-observations.cjs`: gravação, validação, idempotência e resumos puros de visitas.
- `server/guard.cjs`: aceita e valida apenas o metadado opcional; sem mudança de avaliação.
- `server/lab.cjs`: informa elegibilidade da observação no rascunho do próprio usuário.
- `server/research.cjs`: ativação na criação, resumo por lado do par e exportação.
- `server/http.cjs`: rotas protegidas.
- `laboratorio/app.js`: ativação pela equipe, aviso, sinais e painéis.
- `tests/pause-observations.cjs`, `tests/run-pairs.cjs`, `tests/lab-browser.cjs` e `package.json`: testes e comandos.

Executar `npm run test:exposure` para a nova suíte. `npm test` a inclui junto às anteriores. No banco PostgreSQL privado de testes, executar `node --test tests/postgres.cjs tests/recovery.cjs tests/study-summary.cjs tests/run-pairs.cjs tests/pause-observations.cjs`. Não usar banco de produção.

Resultados executados: **182 testes gerais aprovados**, **45 PostgreSQL 17 local aprovados**, sem falhas ou ignorados. PostgreSQL usou schemas isolados em contêiner temporário removido após os ensaios. Verificados ativação, etapa, ator, sequência, campos fechados, idempotência/concorrência, ausência de mutação financeira, perda de saída, falha de gravação, horários, exportação, permissões e HTTP.

Testes adicionais confirmam as mesmas decisões, pesos e espera nos quatro cenários com e sem registro, e repetição fiel de retrato antigo sem a opção. Pares mantêm ativação igual, com contadores separados.

Navegador Chromium/SQLite aprovado nas sete larguras (320, 375, 390, 768, 1024, 1366 e 1920 px). Testada criação com opção desligada por padrão, ativação, aviso, abertura e continuidade reais da interface, conclusão dos dois lados do par e resposta 503 simulada para o registro sem impedir Pix. Testes anteriores de extrato, educação e permissões também passaram. Sintaxe dos arquivos e `git diff --check` aprovados.

Não executados produção autenticada, navegador com PostgreSQL nesta etapa, aparelhos físicos, outros navegadores, estudo com pessoas ou medição real de ocultação de abas em dispositivos. O evento `hidden` e visitas múltiplas foram exercitados nos testes de servidor; não confundir esse ensaio com validação em dispositivos físicos.
