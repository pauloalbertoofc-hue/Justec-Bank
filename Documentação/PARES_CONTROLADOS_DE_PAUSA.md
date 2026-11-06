# JUSTEC — Pares controlados de duração da pausa

## Objetivo e estado

Construir a infraestrutura de uma comparação controlada com dados exclusivamente fictícios. Entrega local na branch `pesquisa-pares-de-pausa`, ainda não publicada. Não houve participação de pessoas, recrutamento ou ensaio de eficácia.

Cada par tem duas execuções independentes do mesmo cenário:

- **Sem espera:** duração configurada de 0 ms.
- **Com espera:** duração escolhida de 1 a 60000 ms.

O modo de proteção, regras, perfis, instruções, titulares dos slots, histórico sintético, valores e operações previstas são iguais na criação. IDs físicos de contas, sessões e execuções são diferentes para manter os livros-razão separados. A identidade do estado-base usa a especificação lógica e os vínculos de titulares, não esses IDs físicos.

**0 ms não remove a tela educativa, a conferência ou a confirmação manual.** O par isola a espera temporal configurada, mantendo os demais passos. Nos modos que podem interromper uma tentativa antes dessa tela, uma operação bloqueada pode não chegar à pausa. Configuração de duração não comprova exposição ou leitura.

## Uso pela equipe

1. Entrar na área administrativa e abrir **Pesquisa** no ambiente de origem.
2. Criar um cenário ou usar um exemplo existente.
3. No formulário **Par de pausa · nome do cenário**, escolher o modo e a duração da segunda execução. O modo padrão é educação. “Sem intervenção adicional” e “Comportamental” não são aceitos para pares de duração porque o motor não aplica espera temporal nesses modos. A seleção foi ajustada na etapa de registro mínimo; execuções individuais preservam todos os modos.
4. Manter o JSON de vínculos vazio para usar o criador como titular, ou informar os mesmos participantes por slot para os dois lados. Todos os titulares informados devem pertencer ao ambiente de origem.
5. Selecionar **Criar par de pausa**. A criação não inicia Pix nem distribui participantes automaticamente.
6. Em **Pares controlados de pausa**, conferir os identificadores, parâmetros fixos, durações e resultados de cada lado. Usar os botões para abrir a execução desejada.

Não há randomização, contrabalançamento de ordem, controle de aprendizado entre tarefas ou cálculo de significância estatística. Isso deverá ser planejado antes de um estudo com pessoas. A ordem dos botões e a ordem de criação não são uma atribuição experimental aleatória.

## Persistência, equivalência e auditoria

Os dois lados usam o mesmo criador interno de execuções já utilizado pelo laboratório. A criação dos dois lados e o registro do par ocorrem em **uma transação**. Se a segunda falhar, sessões, contas, lançamentos, operações e auditoria da primeira também são revertidos.

O vínculo é um evento imutável `experiment.pair_created` no registro de auditoria existente, com versão `justec-pause-pair/1.0.0`, cenário, IDs das duas execuções, duração de cada lado, hash do estado-base e hash dos parâmetros fixos, excluída somente a duração. Não há nova tabela ou migração. Os retratos completos de configuração já ficam preservados nas execuções.

A criação exige `Idempotency-Key` de 16 a 100 caracteres (letras, números, hífen ou sublinhado). O par é identificado de forma estável pelo ambiente, criador e identificador da solicitação. Repetir o mesmo pedido retorna o registro original sem novas contas ou lançamentos. Reutilizar a chave com outro conteúdo retorna conflito. O formulário reutiliza a chave enquanto o pedido for o mesmo; recarregar e gerar outro pedido representa nova criação.

A proteção existente `RUN_CONFIG_FROZEN` continua impedindo alterações de configuração de uma execução experimental pela API. O painel também informa se a versão do ambiente foi atualizada — por exemplo, pelo arquivamento — ou se a configuração atual diverge do retrato original. Este último caso foi testado com edição externa simulada no banco; a API não foi afrouxada para permitir essa edição.

Esses avisos não são auditoria exaustiva de todas as condições de exposição: alterações operacionais em contas, efeitos de ordem, decisões dos participantes, tempo entre tarefas e mudança de versão do código também precisam ser considerados. As avaliações continuam registrando sua versão de regras. Igualdade de configuração não comprova equivalência de experiência durante todo o uso.

## Resultados e exportação

O painel apresenta resultados de cada execução, filtrando os IDs daquele par, mesmo quando outras execuções compartilham base e configuração. Usa o resumo de jornadas da etapa anterior: atribuídas, não iniciadas, em andamento, concluídas, bloqueadas e canceladas. A matriz anterior e os critérios do Guard não foram alterados.

A exportação JSON passa a incluir `pairs`, com vínculos, retratos identificáveis, avisos e resumos separados. O CSV continua contendo linhas por execução/operação; para relacionar os pares, usar `runId` junto aos vínculos do JSON. Não calcular diferenças causais a partir desses totais descritivos.

## Interface técnica

- `POST /api/sessions/:sid/scenarios/:scenarioId/run-pairs`: autenticação, origem, CSRF, autorização de pesquisador/administrador e idempotência; retorna o par.
- `GET /api/sessions/:sid/run-pairs`: somente equipe autorizada do ambiente; retorna pares e resultados.
- `Lab.startRunPair()`: validação, captura única dos parâmetros e criação transacional.
- `Lab.runPairs()`: leitura dos vínculos, configuração atual e resumo por execução.
- `Lab._createRun()`: primitiva interna compartilhada por execução simples e pareada, chamada com contexto validado e transação aberta.

Saldo, fluxo de autorização, critérios de pontuação, permissões existentes e funcionalidades anteriores foram preservados. Não há nova dependência ou integração bancária.

## Verificação

Executar `npm run test:pairs` para os testes novos; `npm test` os inclui junto aos anteriores. No PostgreSQL de testes, configurar as variáveis privadas já usadas pelo projeto e executar `node --test tests/postgres.cjs tests/recovery.cjs tests/study-summary.cjs tests/run-pairs.cjs`. Nunca usar banco de produção para esses ensaios.

Os testes cobrem equivalência dos parâmetros e titulares, bases separadas, operações iguais, ausência de início automático, idempotência e concorrência, conflito de chave, rollback da segunda execução, entradas inválidas, autorização, configuração congelada, avisos, JSON e rotas HTTP. Um teste aplica o relógio controlado do servidor: o lado de 0 ms permite autorização explícita imediata; o lado de 5000 ms recusa até o prazo, sem débito na tentativa antecipada.

### Resultados executados

- `npm test`: **172 aprovados**, zero falhas/ignorados.
- PostgreSQL 17 local: **35 aprovados**, incluindo os sete testes de pares e as suítes anteriores de transações, recuperação e jornadas.
- `npm run test:browser`: aprovado em Chromium/SQLite, incluindo criação do par pelo formulário, leitura de resultados, abertura da execução sem espera, recusa de leitura por participante e painel nas sete larguras de 320 a 1920 px. A suíte existente de Pix, extrato, educação e permissões também passou.
- Sintaxe dos arquivos JavaScript/CJS e `git diff --check`: aprovados.

Um primeiro teste tentou alterar a configuração de uma execução pela API e foi corretamente recusado pela proteção já existente. A expectativa foi corrigida: agora verifica a recusa, o aviso de arquivamento e uma edição externa simulada exclusivamente no banco de testes. Nenhuma proteção do produto foi removida.

PostgreSQL usou schemas isolados em contêiner temporário removido depois dos testes. Não executados navegador com PostgreSQL nesta etapa, testes autenticados de produção, aparelhos físicos, outros navegadores ou estudos com pessoas. O teste temporal específico do par usa relógio controlado; os testes de navegador já existentes continuam exercitando a espera real de cinco segundos na jornada Pix.

## Continuação — observação opcional

A etapa seguinte acrescenta ativação explícita do mesmo registro mínimo nos dois lados e contadores separados de sinais. Permanece desativado por padrão. Consulte [REGISTRO_MINIMO_DA_PAUSA.md](REGISTRO_MINIMO_DA_PAUSA.md) para limites, privacidade e testes; ativação pela equipe não substitui consentimento para estudos com pessoas.
