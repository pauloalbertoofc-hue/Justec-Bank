# JUSTEC — Acompanhamento das jornadas experimentais

## Objetivo e estado da entrega

Preparar o laboratório para futuras comparações com dados fictícios, verificadas automaticamente antes dos testes com pessoas. Implementação local na branch `pesquisa-jornadas-incompletas`, sem publicação nesta etapa. Não há recrutamento, ativação de experimento com usuários reais ou comprovação de eficácia.

O projeto já possuía condições de proteção, duração configurável da pausa, cenários, execuções repetíveis, matriz VP/FP/VN/FN e autorrelatos. Esta entrega acrescenta a visão de todas as operações atribuídas, evitando analisar somente as que terminaram.

## O que aparece no painel Pesquisa

Em **Comparação experimental → Todas as jornadas atribuídas**, cada combinação de estado-base e configuração mostra:

| Campo | Significado |
|---|---|
| Atribuídas | Operações previstas nas execuções, com ou sem tentativa iniciada. |
| Não iniciadas | Operações sem rascunho de transferência. Não significa abandono observado. |
| Em andamento | Rascunhos em conferência, verificação ou pausa. Não implica que o usuário ainda esteja na tela. |
| Concluídas | Transferências fictícias autorizadas. |
| Interrompidas pelo sistema | Tentativas com estado bloqueado. Não equivalem a fraude comprovada. |
| Canceladas | Operações cujo último estado considerado é cancelado. Não significa dinheiro recuperado ou fraude evitada. |
| Com reconsideração | Operações que tiveram cancelamento ou nova conferência na cadeia; podem terminar concluídas. Não somar esta coluna às categorias finais. |
| Pausa configurada | Valor preservado no retrato da configuração da execução. Não mede exposição real à tela ou tempo de leitura. |

A identidade visual da condição, do estado-base e da configuração permite distinguir grupos. Expandir **Resultados por rótulo do cenário** apresenta os mesmos totais por gabarito fictício legítimo/fraudulento. Essa informação permanece restrita à equipe autorizada e nunca é usada como indicador pelo motor.

## Denominadores e limites de interpretação

Os cinco estados de resultado — não iniciada, em andamento, concluída, bloqueada e cancelada — somam o total atribuído. O resumo acrescenta:

- `completionRate`: concluídas / atribuídas.
- `cancellationRate`: canceladas / atribuídas.
- `resolutionRate`: (concluídas + bloqueadas + canceladas) / atribuídas; disponível no JSON, sem interpretação de sucesso preventivo.

Sem operações, as taxas são `null`, não zero. A matriz anterior continua usando somente concluídas/bloqueadas; seus critérios e pesos não foram alterados. Reconsideração histórica pode coexistir com conclusão. A cadeia de revisão é seguida pelo cálculo já existente, sem duplicar a operação atribuída.

Para estudar especificamente a pausa, comparar a mesma base, mesmo modo e demais parâmetros idênticos, mudando somente sua duração. Não comparar condições com motores e regras diferentes como se a pausa fosse a única diferença. O painel não faz pareamento automático nem randomização. Um modo sem intervenção pode não aplicar pausa, mesmo que sua configuração contenha uma duração: não inferir exposição a partir dela.

O tempo médio já existente mede duração dos rascunhos terminados considerados pela matriz; não é tempo de leitura nem duração de todas as jornadas. Esta entrega não altera sua definição. Autorreporte também não é prova de efeito causal.

## Implementação

- `server/study-summary.cjs`: função pura `summarizeJourneys(rows)`, sem acesso ao banco ou à interface. Valida estados, rótulos, identificadores e duplicação por execução/operação; calcula totais, taxas e resultados por rótulo sem modificar entradas.
- `server/research.cjs`: acrescenta a duração configurada a partir do retrato original da execução e agrega `journey` aos grupos existentes. Nenhuma migração ou gravação nova.
- `laboratorio/app.js`: tabela de acompanhamento e detalhamento restrito por rótulo; tabelas com rolagem própria para preservar a largura da página.
- Exportação JSON inclui os resumos; CSV acrescenta `pauseConfiguredMs` e `reconsidered` por operação. Consumidores externos devem identificar colunas pelo cabeçalho. Não foram removidas colunas existentes.
- `tests/study-summary.cjs`: testes puros e integração com SQLite/PostgreSQL.
- `tests/lab-browser.cjs`: painel novo, exportação e ausência de rolagem horizontal em sete larguras, além das verificações existentes.

Não foram modificados saldo, autorização do Pix, decisão do Guard, condições experimentais existentes, consentimento, contas ou permissões. Nenhum dado de produção foi consultado.

## Testes e execução

`npm run test:study` executa a nova suíte. `npm test` a inclui junto aos testes gerais. Com banco PostgreSQL de testes configurado privadamente, `node --test tests/postgres.cjs tests/recovery.cjs tests/study-summary.cjs` exercita o mesmo domínio no outro armazenamento. Nunca usar o banco de produção para esses ensaios.

Executados: **165 testes gerais aprovados** e **28 testes em PostgreSQL 17 local aprovados**, sem falhas ou ignorados. O PostgreSQL usou contêiner temporário e schemas isolados, removidos após o uso. Sintaxe JavaScript e `git diff --check` aprovados.

Testes incluem amostra vazia, entradas inválidas, duplicação, ausência de mutação, todos os estados, separação por rótulo, cancelamento seguido de conclusão, denominadores, segregação de durações de pausa, preservação da configuração original após mudar o ambiente, exportação e recusa de consulta por participante. A consulta das métricas não adiciona auditoria ou altera registros financeiros.

## Próximas construções possíveis

1. Preparar pareamento automatizado de execuções, garantindo que apenas a duração da pausa difira e preservando a configuração de ambas.
2. Definir registro mínimo de exposição à pausa, com início/fim e sem capturar digitação, antes de medir leitura ou abandono.
3. Definir protocolo e consentimento aplicáveis antes de envolver participantes; depois acrescentar compreensão e experiência percebida aos critérios de análise.
4. Planejar detecção de regressões para cada novo componente e manter separado o que foi executado localmente, publicado e observado com pessoas.

Nada nesta entrega substitui os testes futuros de usabilidade ou validação científica.

Verificação final de navegador: `npm run test:browser` aprovado em Chromium/SQLite. O painel de pesquisa foi verificado nas sete larguras (320, 375, 390, 768, 1024, 1366 e 1920 px), sem rolagem horizontal da página; exportação incluiu a interrupção de cenário legítimo como falso positivo. Os testes existentes de Pix, extrato, educação e permissões também passaram. Não executados produção autenticada, aparelhos físicos, outros navegadores ou estudos com pessoas.
