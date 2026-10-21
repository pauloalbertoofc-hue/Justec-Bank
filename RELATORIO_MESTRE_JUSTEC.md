# Relatório Mestre JUSTEC

## Correção da Etapa 3 — 17/10/2026

### Histórico disponível e escopo

O arquivo RELATORIO_MESTRE_JUSTEC.md não existia no projeto recebido. Este registro inaugura o relatório; nenhum registro anterior foi removido. Os arquivos do ZIP já estavam no checkout como arquivos não rastreados. Não houve commit, envio ao GitHub, integração bancária real ou inclusão de dependências.

### Problema e causa técnica

O saldo está em `index.html`, no elemento `#balance-display`, e o olho em `#eye-icon`, dentro do botão que chama `toggleBalance()`.

A página não carregava `js/app.js`. Executava uma cópia antiga de toda a lógica em um script inline no final do HTML. Nesse script, `let isBalanceVisible` e `toggleBalance()` apenas alternavam as classes do ícone, sem atualizar o texto do saldo. O arquivo externo já continha `bankState`, `renderBalance()` e uma implementação que atualizava o saldo, mas não era utilizado.

Havia duas versões das funções no projeto, embora apenas a inline estivesse carregada. Adicionar o script externo sem remover o antigo também criaria conflito na declaração global de `currentPixType`. Não foram encontrados erros de sintaxe em `js/app.js`; o defeito era de integração e uso da implementação antiga. As oito funções dos demais fluxos foram comparadas entre as duas versões e eram equivalentes, desconsiderando espaços.

### Arquivos e funções modificados

- `index.html`: substituído o script inline de interações por uma única referência relativa a `./js/app.js`, no final do body. Assim, o DOM já existe quando `renderBalance()` é executada. Removidas da página a variável isolada `isBalanceVisible` e a cópia antiga das funções. O botão recebeu `id="balance-toggle"`, `type="button"`, `aria-controls="balance-display"` e nome acessível inicial `Ocultar saldo`.
- `js/app.js`: mantidos `bankState.balance = 2480.50` e `bankState.isBalanceVisible = true` como fonte única do saldo. `renderBalance()` atualiza o texto com `toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })`, mostra `R$ ••••••` quando oculto e sincroniza `fa-eye`/`fa-eye-slash`. Foi acrescentada a atualização do nome acessível do botão para `Ocultar saldo` ou `Exibir saldo`. `toggleBalance()` alterna o booleano e chama `renderBalance()`; a chamada inicial já existente renderiza o estado ao carregar.
- `RELATORIO_MESTRE_JUSTEC.md`: registro do diagnóstico, correção e validação.

`css/style.css` não foi alterado. Os estilos inline e as oito funções dos demais fluxos permaneceram iguais aos originais. Nenhuma classe visual do botão foi modificada. Não foram adicionados listeners duplicados: o onclick existente continua sendo a única ligação do botão à função. O HTML alternativo de protótipo não foi modificado.

### Testes executados e resultados

Executados no ambiente em nuvem, servindo o projeto por HTTP com Python 3, em Chromium headless usando o Playwright já disponível no ambiente. Nenhuma dependência de teste foi adicionada ao projeto.

1. `node --check js/app.js`: passou, sem erro de sintaxe.
2. GET da página principal: HTTP 200; o script externo foi carregado e executado nos testes de navegador.
3. Saldo inicial: passou, `R$ 2.480,50`, ícone `fa-eye`. A comparação normalizou o espaço não separável que a formatação monetária pode produzir.
4. Primeiro clique no botão: passou, `R$ ••••••`, ícone `fa-eye-slash`, nome acessível `Exibir saldo`.
5. Navegar a Direitos e voltar à Home: passou, saldo continuou oculto.
6. Segundo clique: passou, saldo original restaurado, ícone `fa-eye`, nome acessível `Ocultar saldo`.
7. Navegação pelas seis telas: passou; somente a tela selecionada ficou sem a classe `hidden`.
8. Triagem: passaram os três diagnósticos — falsa central, falso parente e oferta suspeita — com títulos esperados e abertura/fechamento dos modais.
9. Orientação MED: passou, título esperado no modal.
10. Pix seguro: passou, `Pix Realizado com Segurança!`. Pix suspeito: passou, `Transferência Retida!`. Alteração de valor pelo prompt: passou com `125,75`.
11. Recarregar página: passou, saldo reiniciado visível com o valor inicial.
12. Comparação dos estilos inline e das oito funções não relacionadas ao saldo com cópias anteriores à edição: passou, preservados.

O primeiro teste amplo parou no clique por coordenadas no leitor biométrico animado, com erro de elemento fora da área visível. A repetição usou `dispatchEvent('click')` apenas nesse leitor e completou os testes de lógica. Os demais cliques foram executados com `force: true`; portanto, os resultados verificam eventos, estado e DOM, sem garantir posicionamento, visibilidade ou sobreposição visual dos controles.

### Limitações, pendências e recomendações

- CDNs de Tailwind, Font Awesome e Google Fonts falharam por bloqueio de rede. O navegador registrou `tailwind is not defined` no script de configuração visual, antes de executar normalmente o script independente de interações. Não houve outros erros JavaScript nos cenários do teste final. Não se afirma que a página esteja sem erros de console.
- Não foi possível validar o desenho dos glifos dos ícones, a aparência completa, a visibilidade real das telas ou a interação visual sem cliques forçados. Foram verificadas as classes de ícone e de ocultação. Liberar os recursos externos e repetir a inspeção visual.
- O VS Code e sua extensão Live Server não foram executados nesta máquina; a validação usou servidor HTTP estático equivalente para carregar HTML e JavaScript. É necessária a conferência manual abaixo no computador do usuário.
- O HTML alternativo `Protótipo JUSTEC - Banco Digital & Anti-Golpe.html` continua referenciando `css/styles.css` e `js/scripts.js`, inexistentes. A entrada corrigida e validada é `index.html`.
- Não há suíte de testes própria nem manifesto de dependências no projeto recebido. O teste temporário desta sessão está em `/tmp/justec-balance-check.cjs`, sem garantia de retenção em outra máquina.
- Recomenda-se manter somente uma fonte de lógica e, em tarefa futura, avaliar a consolidação dos estilos duplicados e a estratégia de recursos externos. Nenhuma dessas alterações adicionais foi realizada nesta correção.

### Como validar no Live Server

1. Abra a pasta do projeto no VS Code e inicie o Live Server em `index.html`.
2. Recarregue sem cache e confirme `R$ 2.480,50` e o olho aberto.
3. Clique no olho: deve aparecer `R$ ••••••` e o olho riscado.
4. Navegue para outra tela e retorne: o saldo deve continuar oculto. Clique novamente para revelar o valor e restaurar o olho aberto.
5. Teste os três diagnósticos de triagem, feche os modais, abra a orientação MED e simule Pix seguro e suspeito, incluindo o toque no leitor simulado.
6. No painel de rede, confirme HTTP 200 para `js/app.js`; no console, confira a ausência de declarações duplicadas ou referências inválidas. Confirme também que as CDNs carregam para validar aparência e ícones.

## Etapa 4 — Extrato bancário interativo — 17/10/2026

### Objetivo e referência visual

Adicionar “Ver extrato” abaixo do saldo, respeitando a captura fornecida: azul-escuro, amarelo #FFCC00, cantos arredondados, tipografia e moldura existentes. A etapa permanece acadêmica, sem backend, autenticação real, consulta a bancos ou movimentação de dinheiro.

### Arquivos criados e modificados

- Criado `js/transactions.js`: cenário fixo e 12 movimentações estruturadas.
- Modificado `index.html`: botão compacto no cartão, tela `screen-statement`, resumo, filtros, lista e diálogo nativo de comprovante. Os scripts carregam os dados antes da lógica. Passou a carregar `css/style.css`, anteriormente desconectado da página principal. O conteúdo rolável recebeu identificador e altura mínima flexível; a barra inferior não encolhe.
- Modificado `css/style.css`: componentes do extrato e do comprovante com seletores próprios, sem substituir o tema das telas anteriores.
- Modificado `js/app.js`: navegação do extrato, funções de dados e interface, saldo compartilhado e textos explícitos de simulação nos cenários Pix antigos que sugeriam consulta ao Banco Central ou denúncias reais.
- Criados `tests/statement.cjs` e `tests/balance.cjs`: testes de navegador reutilizáveis. Usam Playwright e Chromium existentes no ambiente; nenhuma dependência ou framework foi adicionado à aplicação.
- Atualizado este relatório por acréscimo, preservando a Etapa 3.

### Dados e coerência financeira

Cada movimentação contém ID único DEMO, data ISO com fuso -03:00, tipo (`pix-in`, `pix-out`, `debit`, `payment`), descrição, valor assinado, status e participante/instituição fictícios. São quatro entradas e oito saídas, distribuídas de 01/08/2026 a 17/10/2026. Os status são Concluída, Em análise e Sinalizada como suspeita.

Saldo inicial fictício R$ 1.000,00 + entradas R$ 2.650,00 − saídas R$ 1.169,50 = saldo disponível R$ 2.480,50. Esse resultado inicializa `bankState.balance`, sem criar outro estado de saldo. Neste cenário, saídas em análise e suspeitas já estão contabilizadas; isso é informado na tela. O resumo de entradas e saídas acompanha o filtro, enquanto o saldo disponível representa o cenário completo e não muda ao filtrar.

O período usa uma data demonstrativa explícita, 17/10/2026, em vez do relógio do dispositivo. Assim, o conteúdo não desaparece com o passar do tempo. Os filtros abrangem dias de calendário em America/Sao_Paulo, incluindo o dia de referência: 7 dias mostram 6 itens; 30 dias, 9; 90 dias, 12.

### Arquitetura e funções

- `formatMoney()`: formatação BRL centralizada, também reutilizada pela Home.
- `calculateTotals()`: soma em centavos inteiros, com entradas, saídas positivas e resultado líquido; evita acumulação de erros decimais.
- `filterTransactions()`: aplica janela inclusiva de dias e direção da movimentação, ordenando da mais recente para a mais antiga.
- `transactionDate()` e `transactionStatus()`: apresentação consistente de datas no fuso brasileiro e dos rótulos simulados.
- `renderTransactions()`: monta botões de movimentação com texto seguro (`textContent`), data/hora, participante, operação, valor e status; atualiza totais, contagem e estado vazio.
- `renderStatementBalance()`: espelha `bankState.isBalanceVisible`, inclusive ícone e nome acessível. `toggleBalance()` atualiza Home e Extrato. O botão “Ver extrato” funciona mesmo com saldo oculto.
- `navigateTo()`: inclui a nova tela e reinicia a rolagem do conteúdo ao trocar de tela.
- `showTransactionDetails()`: seleciona uma movimentação e preenche o diálogo com ID fictício, operação, participante, instituição, valor, horário e status. Apresenta aviso destacado de simulação e sem validade bancária.
- `closeTransactionDetails()` e `navigateFromReceipt()`: fechamento, retorno de foco e integração com prevenção/pós-golpe. O diálogo nativo também permite Escape e restringe o foco enquanto aberto.
- `copyReceipt()`: usa Clipboard API; o texto copiado contém aviso de simulação no início e ausência de operação real no final. Informa sucesso ou falha, sem alegar cópia quando a permissão é negada.
- `showDisputeEducation()`: disponível apenas para saídas. Exibe orientação para canais oficiais e preservação de evidências, afirmando que nenhuma contestação foi aberta. Permite acessar o guia pós-golpe.

A movimentação suspeita tem aviso textual/visual e caminhos para prevenção e pós-golpe. Nenhuma consulta externa é realizada. Ocultar saldo não oculta valores individuais, totais de entradas/saídas ou comprovantes; a tela informa esse comportamento. Não existe exportação com aparência de documento bancário autêntico.

### Decisões de interface e problemas resolvidos

O novo link tem ícone Font Awesome e ocupa apenas uma linha abaixo do saldo. A tela reaproveita o contêiner de rolagem existente, preservando a barra inferior como item flexível de tamanho fixo. O comprovante usa `dialog` responsivo, com limite de altura e rolagem própria, avisos persistentes e ações com nomes explícitos. Os valores de entrada/saída têm indicação textual, além de cores. O resumo ocupa duas colunas, com saldo em largura total.

A página principal não usava o arquivo de estilos externo: o vínculo foi incluído para carregar os novos estilos. As funções e telas anteriores foram preservadas; somente os textos Pix que sugeriam verificação real foram esclarecidos como cenários fictícios. A aplicação continua utilizável via servidor HTTP estático sem instalação de pacotes.

### Testes executados e resultados

Executados com Python HTTP server, Chromium headless e Playwright já disponíveis no ambiente:

1. `node --check js/app.js` e `node --check js/transactions.js`: passaram.
2. `node tests/statement.cjs`: passou. Verificou saldo inicial e compartilhado entre telas; abertura do extrato com saldo oculto; 12 IDs únicos; totais exatos; quantidades dos filtros 7/30/90; filtros de entradas e saídas e seus totais; detalhes de entrada, saída suspeita e saída em análise; ausência de contestação em entradas; alerta somente no cenário suspeito; orientação sem abertura real; navegação para prevenção e pós-golpe; fechamento por botão e Escape; estado vazio sem modificar os dados persistidos.
3. Área de transferência: cópia real executada e texto lido pelo Chromium com permissão concedida; aviso SIMULAÇÃO EDUCACIONAL — SEM VALIDADE BANCÁRIA confirmado. Falha de permissão também exercitada por rejeição controlada e mensagem de erro confirmada.
4. `node tests/balance.cjs`: teste de regressão executado com saldo inicial, dois cliques, classes dos ícones, nomes acessíveis, estado durante navegação, seis telas anteriores, três diagnósticos, modais, orientação MED, Pix seguro/suspeito, alteração de valor e recarga. Resultado final registrado abaixo após a conclusão da execução.

Os testes do extrato disparam eventos DOM: verificam lógica e estado, sem atestar coordenadas, aparência ou sobreposição. O teste anterior usa cliques forçados e evento DOM no leitor animado. Essas condições são limites do teste, não evidência de validação visual completa.

### Limitações e pendências técnicas

As CDNs continuam bloqueadas neste ambiente: Tailwind, Font Awesome e Google Fonts não carregam. O navegador registra `tailwind is not defined` na configuração visual; os testes rejeitam outros erros de execução. A conferência dos glifos, layout final, responsividade visual, rolagem e ausência de sobreposição com a barra inferior ainda exige navegador com esses recursos carregados. Nenhum teste visual foi declarado aprovado.

O Live Server do VS Code não foi executado; o servidor HTTP estático foi usado como equivalente para validação funcional. A Clipboard API depende de contexto seguro (HTTPS ou localhost) e permissão do navegador; há mensagem de falha quando indisponível. O HTML alternativo antigo permanece fora do escopo. Nenhuma publicação da Etapa 4 ou envio dessas alterações ao GitHub foi executado nesta tarefa.

### Como reproduzir e próximas etapas

No Live Server, abra `index.html`, teste ocultar saldo e clique em “Ver extrato”. Verifique os filtros, os detalhes e o aviso de simulação; copie um comprovante; selecione uma saída suspeita e acesse as orientações de contestação e os guias educativos. Feche também com Escape. Volte ao início e confirme a sincronização do saldo. Confira a lista longa rolando sem cobrir a barra inferior em telas estreitas.

Para automatizar em ambiente com Playwright e Chromium já instalados, sirva a raiz com `python -m http.server 8000 --bind 127.0.0.1 --directory /workspace/Justec-Bank` e execute os dois arquivos em `tests`. O teste do extrato aceita `JUSTEC_TEST_URL` e `CHROMIUM_PATH` para outro endereço ou executável. A aplicação em si não precisa desses pacotes para funcionar.

Próximas verificações recomendadas: inspeção visual com CDNs acessíveis em desktop e celular, navegação por teclado/leitor de tela e testes em outros navegadores. Se houver publicação futura, repetir os fluxos no endereço HTTPS e confirmar permissões de área de transferência.

Resultado final da regressão após as últimas alterações: `node tests/balance.cjs` concluiu com código 0; todos os cenários funcionais listados passaram. Permaneceram apenas as falhas externas de CDN e os dois registros `tailwind is not defined` (carga e recarga), já descritos como pendências visuais.

## Reorganização do Guia MED — 17/10/2026

Removido o atalho Guia MED dos serviços da tela inicial e ajustada essa grade para três colunas. Adicionado “Acessar Guia MED” no cartão explicativo do MED em Direitos, apontando para o fluxo educativo existente. Mantidos os acessos emergenciais pós-golpe.

Teste executado em Chromium/Playwright: ausência do atalho na Home, três serviços, navegação Home → Direitos → Guia MED e abertura do roteiro para o banco passaram. Validação por eventos DOM; a conferência visual com CDNs carregadas continua pendente. Alteração funcional limitada a `index.html`.

## Etapa 5 — Home, simulador Pix e proteção preventiva — 17/10/2026 (horário de Brasília)

### Inspeção e decisões de arquitetura

Inspecionados HTML, estilos, dados das movimentações, funções de saldo, navegação, extrato, triagem, modais, guia MED e testes existentes. A versão anterior tinha Pix de dois cenários com resultado visual e “digital”, sem lançamento no extrato ou débito do saldo. O estado do saldo estava em `app.js` e os dados iniciais em `transactions.js`. Foram preservados HTML/CSS/JavaScript sem framework, backend ou novas dependências de execução. O HTML alternativo antigo, não publicado nem integrado à aplicação principal, continua preservado fora do fluxo.

O novo Pix substitui a implementação anterior; não mantém outra função homônima nem código de suposta biometria. O gerenciamento de estado foi extraído, e o extrato passou a ler a mesma coleção atualizada pelo simulador.

### Arquivos e estrutura de dados

- `index.html`: Home com saldo/extrato, seis serviços e Rota da Segurança abaixo; novo formulário Pix em etapas; telas Proteção de Chaves Pix, Central de revisão e Central de segurança; aviso global “Ambiente de demonstração — operações fictícias”; quatro seções educativas adicionadas ao pós-golpe, preservando checklist emergencial, provas, ocorrência e roteiro MED.
- `css/style.css`: componentes escuros/amarelos, grade de serviços, formulários, mensagens e foco visível. A regra local de ocultação não depende da CDN, preservando telas e seções escondidas mesmo se ela falhar.
- `js/state.js` (novo): `bankState` único contém visibilidade, saldo inicial, transações, tentativas, restrições e sequência de identificadores. O saldo é derivado da soma em centavos, em vez de manter valor e lançamentos separados. `demoId()` gera IDs sequenciais únicos na sessão; `demoDate()` mantém datas no cenário fixo de 17/10/2026. `recordApprovedPix()` verifica saldo e deduplica pelo ID; `recordInterruptedPix()` registra tentativas fora do extrato e cria restrição interna se necessário.
- `js/risk.js` (novo): configurações `riskRules`, destinatários `demoRecipients` e função independente `evaluateRisk()`. Inicializa duas restrições fictícias para apresentação, uma revisável por falso positivo e outra mantida.
- `js/pix.js` (novo): formulário, estados da operação, análise demonstrativa, confirmação, resultado, listagens de proteção e revisão. Não faz requisições bancárias.
- `js/app.js`: navegação ampliada e extrato/detalhes integrados a `bankState.transactions`. Mantidas funções de saldo, formatação, triagem, MED, comprovante e contestação educativa de movimentações. Removidas as antigas funções `changePixValue`, `startBiometricVerification`, `confirmBiometricSuccess` e a antiga cópia de `openPixFlow`.
- `tests/pix.cjs`, `tests/layout.cjs` e `tests/resources.cjs` (novos); testes anteriores adaptados ao estado compartilhado e ao novo fluxo Pix. O adaptador de recursos é opcional e restrito aos testes.

Movimentação aprovada: ID PIX, data do cenário, tipo pix-out, descrição explícita de simulação, valor negativo, status completed e participante/instituição fictícios. Tentativa: ID da operação, destinatário, data, valor e motivos, sem lançamento financeiro. Restrição: ID REV, destinatário, motivos, data, estado, justificativa e histórico; a marca `falsePositive` seleciona o resultado educativo pré-definido. Chaves digitadas não são mantidas completas no estado: somente uma representação mascarada, com destinatário fictício.

### Fluxo e funções do Pix

`openPixFlow()` abre nova operação, limpa confirmações e preserva o saldo/históricos da sessão. `resetPixSteps()` invalida qualquer conferência anterior; alterações nos campos obrigam nova conferência. `updatePixRecipient()` permite selecionar os quatro destinatários fictícios ou informar chave ilustrativa.

`isDemoKey()` reconhece somente formatos ilustrativos: CPF/CNPJ com ou sem pontuação, telefone internacional com + e dígitos, e-mail ou UUID. Não valida dígitos verificadores, existência ou titularidade. O formulário avisa para não informar dados reais. `parsePixAmount()` aceita valores brasileiros (50,00; 1.234,56), rejeita negativos, exponentes e mais de duas casas; `formatPixAmount()` normaliza a apresentação ao sair do campo. O limite por operação é R$ 2.000,00; valores não positivos e acima do saldo fictício não avançam.

`preparePix()` captura os dados validados e cria rascunho com ID e etapa confirmation. `analyzePix()` exige checkbox de conferência, mostra carregamento/aria-busy e aplica o Guard após pequena espera ilustrativa. Alterações feitas durante a espera invalidam o resultado antigo. Nenhuma análise externa ocorre.

`showDemoAuthentication()` exige confirmação adicional no risco moderado; apresenta apenas checkbox de operação fictícia, sem senha ou impressão digital. `completePix()` exige essa confirmação, reavalia risco e saldo, registra uma única operação e atualiza ambos os saldos. Estados do rascunho impedem reenvio por clique repetido. `interruptPix()` não debita, registra a tentativa e oferece revisão. `openPixReceipt()` abre a movimentação no extrato com o comprovante demonstrativo existente, sem validade bancária.

### Guard: regras, pesos e limites

| Indicador exclusivamente fictício | Pontos |
| --- | ---: |
| Chave recém-cadastrada | 20 |
| Destinatário não habitual | 15 |
| Valor superior a R$ 1.000,00 | 25 |
| Mudança de comportamento no cenário | 20 |
| Alerta interno fictício | 40 |
| Duas ou mais tentativas interrompidas anteriores | 15 |

Baixo: menos de 30 pontos. Moderado: de 30 até 59, com alerta e confirmação adicional. Elevado: 60 ou mais, interrompendo a operação. Uma restrição interna ainda não retirada também impede envio, independentemente da pontuação. Nenhum indicador individual alcança o limiar elevado nem constitui prova de fraude. Valores de pesos/limiares podem ser ajustados no objeto `riskRules`; o seletor de chave informada permite apresentar cenários baixo, moderado e elevado.

Resultados de exemplo com R$ 50,00: Escola A = 0, baixo; Escola B = 35, moderado; Escola C = 75 e restrição interna ativa, elevado; Escola D = 60 e restrição ativa, cenário de falso positivo. Valores maiores e repetição podem aumentar a classificação. A retirada no cenário D limpa os indicadores incorretos simulados e as tentativas anteriores para essa avaliação, mas o indicador de valor continua aplicável. Estes pesos não foram validados para uso financeiro real e podem gerar falsos positivos/negativos.

### Proteção, contestações e revisão

`renderProtection()` preenche lista de destinatários com chave mascarada, risco, motivos, data e estado da revisão, além de central de revisões e histórico separado de tentativas. `demoElement()` usa textContent, inclusive para justificativas, evitando interpretar HTML fornecido nos campos. `demoButton()` liga ações específicas aos botões das listagens.

`requestReview()` exige justificativa fictícia entre 10 e 500 caracteres. Transição: Restrição ativa (ou mantida) → Revisão solicitada. `advanceReview()` permite avançar manualmente para Em análise e então apresentar Restrição mantida ou Restrição retirada, conforme o cenário previamente informado. O histórico e a justificativa ficam disponíveis no cartão; mensagens de status indicam que nenhum pedido foi enviado a um banco.

A Escola D demonstra falso positivo com revisão procedente e retirada interna, permitindo novo Pix fictício. A Escola C mantém a restrição após revisão. Não existe promessa de decisão individualizada: os resultados são pré-definidos para a apresentação. A retirada não exclui registros oficiais, não modifica DICT nem desbloqueia contas reais.

### Navegação, interface e orientações emergenciais

Os seis serviços da Home levam a Fazer Pix, Movimentações, Proteção de chaves (verificar/bloqueios), Revisões (contestações) e Central de segurança. A barra inferior e as telas anteriores continuam disponíveis. A área de conteúdo rola sem cobrir a navegação. O extrato mantém os filtros por período/tipo e os comprovantes; os novos Pix usam a data do cenário para permanecerem visíveis nos filtros atuais.

O pós-golpe agora diferencia alerta, interrupção, restrição interna fictícia e medidas oficiais. Inclui esclarecimentos/revisão e mantém os passos essenciais de contato imediato com o banco, MED quando cabível, preservação de provas, protocolo e ocorrência. O botão do roteiro orientativo continua funcional. Não há garantia de recuperação de valores.

### Validação efetivamente executada

Todos os scripts novos e `app.js` passaram em `node --check`.

`tests/pix.cjs`: passou em Chromium usando cliques reais nos campos/botões do fluxo (funções de abertura/navegação também usadas para preparar cenários). Exercitados: Pix comum aprovado; risco moderado sem e com confirmação adicional; risco elevado; valor zero, negativo, texto, casas extras, notação exponencial e limite excedido; saldo insuficiente dentro do limite; confirmação de dados e de simulação obrigatórias; edição invalidando conferência; débito/extrato e totais coerentes; comprovante; múltiplas chamadas sem duplicação; interrupções mantendo saldo e extrato; repetição de tentativas; cinco formatos de chave; chave inválida; chave customizada elevada e mascarada; revisão com motivo inválido/válido; Revisão solicitada → Em análise → retirada por falso positivo; novo Pix após retirada; manutenção no outro cenário; reinício por recarga. Um alerta isolado de 40 pontos foi confirmado como moderado.

Exemplo financeiro observado: saldo 2.480,50 → Pix baixo 50,00 → 2.430,50 → Pix moderado 60,00 → 2.370,50. Duas interrupções não mudaram esse valor. Após revisão procedente, Pix 20,00 → 2.350,50. Os lançamentos foram de 12 para 15, com tentativas mantidas separadamente.

`tests/statement.cjs`: passou após ajustar o seletor do link da Home e a coleção compartilhada. Validou filtros 7/30/90, entradas/saídas, totais iniciais, saldo compartilhado, detalhes, cópia real em clipboard e falha controlada, Escape/fechamento, contestação educativa, prevenção/pós-golpe e estado vazio.

`tests/balance.cjs`: passou para saldo, ícone, nomes acessíveis, navegação antiga, diagnósticos de triagem, modais, orientação MED e recarga. As verificações do Pix antigo foram substituídas pelos cenários de `tests/pix.cjs`, pois os controles antigos foram intencionalmente removidos.

`tests/layout.cjs`: passou com larguras 320, 375 e 430 pixels para Home, Pix, Extrato, Proteção, Revisões, Central e Pós-golpe. Verificou limites do conteúdo em relação à barra inferior e ausência de overflow horizontal. Capturas de Home e Revisões foram inspecionadas, preservando tema e moldura; páginas longas exigem rolagem vertical.

O Chromium inicialmente falhou ao carregar CDNs diretamente, mas curl obteve os mesmos recursos oficiais por HTTPS com verificação TLS. `JUSTEC_RESOURCE_BRIDGE=1` habilita um adaptador de teste que repassa esses bytes ao navegador apenas para cdn.tailwindcss.com, cdnjs.cloudflare.com, fonts.googleapis.com e fonts.gstatic.com. Nenhuma configuração de confiança foi desativada, e a aplicação publicada continua usando suas referências normais. Na execução final com esse adaptador, as três suítes funcionais não registraram erros JavaScript. Sem ele, a execução inicial do Pix passou na lógica, mas teve os erros de Tailwind já conhecidos do ambiente.

### Erros encontrados e correções

A suíte antiga procurava `.statement-link` sem contexto; o novo link educativo de revisão tornou o seletor ambíguo. Foi limitado a `#screen-home .statement-link`, mantendo a verificação de navegação. O teste de estado vazio antes alterava a coleção inicial em vez do estado atual; foi atualizado para `bankState.transactions`. O código antigo de digital e os dados estáticos que sugeriam conta verificada/consulta ao Bacen foram removidos junto ao fluxo Pix substituído.

### Uso no Live Server, reinício e pendências

Abra `index.html` pelo Live Server. Em Fazer Pix, use Escola A e 50,00, confira os dados, execute a análise, confirme a simulação e confira saldo/extrato/comprovante. Repita com Escola B e confirme o alerta moderado. Use Escola C para observar interrupção, sem desconto, e consulte Central de segurança → histórico. Em Contestações, selecione o cartão da Escola D, informe justificativa fictícia, solicite revisão, inicie análise e exiba o resultado; novo Pix para D deverá poder prosseguir em valores baixos. Para demonstrar manutenção, use Escola C. Recarregue para reiniciar tudo: não há localStorage, banco de dados ou persistência.

Para repetir as suítes em ambiente com Playwright/Chromium instalados, sirva a raiz por HTTP e execute `JUSTEC_RESOURCE_BRIDGE=1 node tests/pix.cjs`, `node tests/statement.cjs`, `node tests/balance.cjs` e `node tests/layout.cjs`, usando o mesmo prefixo em todos se o Chromium precisar do adaptador. Esse pacote de testes não é necessário para abrir o projeto no Live Server.

Não foi executada a extensão Live Server do VS Code, nem testes em Safari/Firefox, leitor de tela ou dispositivos físicos. A revisão tem decisões manuais determinísticas, não fila real. Datas e padrões são fixos para apresentação; nenhuma regra é adequada a produção financeira. Valores customizados e justificativas devem ser fictícios. Próximos passos recomendados: testes com tecnologia assistiva, navegação completa somente por teclado e avaliação em outros navegadores; eventual persistência deve preservar o caráter acadêmico e exigir projeto específico. Nenhuma integração financeira real foi implementada ou proposta como pronta.

## Etapa 6 — Motor experimental isolado do JUSTEC Guard

### Escopo, inspeção e especificação pendente

Inspecionados estrutura, estado Git, motor da Etapa 5 e testes Pix. O motor atual `js/risk.js` depende do estado bancário e continua intacto. Os arquivos de interface, saldo, extrato e navegação não foram modificados; nenhum script de `js/guard` foi incluído no HTML. Esta etapa adiciona uma biblioteca experimental independente, não integra nem substitui o motor usado pelo site.

O documento citado `JUSTEC_Guard_Etapa_6_Especificacao.md` não foi encontrado no workspace nem nos materiais anexados disponíveis. Seu conteúdo foi solicitado ao usuário. A implementação segue os requisitos explícitos da mensagem, com pesos e limiares provisoriamente reaproveitados da Etapa 5. Não se declara conformidade com uma especificação que não foi recebida. Validá-la contra o documento permanece uma pendência.

### Arquivos e funções implementados

- `js/guard/risk-engine.js`: `evaluateRisk()` recebe somente `{ simulation: true, indicators: string[] }`; valida campos e indicadores, elimina duplicatas, ordena pela tabela de regras e soma pesos. Retorna score, classification, indicadores acionados com pesos/justificativas, justifications, rulesVersion e aviso de simulação. `validateEvaluation()` reconstitui os resultados e rejeita pontuação, classificação, pesos, justificativas ou versão inconsistentes. `assertPlainObject()`/`assertKeys()` validam objetos simples e o contrato de campos. `freezeDeep()` cria uma cópia profundamente congelada; não modifica nem congela objetos do chamador.
- `js/guard/policy-engine.js`: `determinePolicy()` valida a avaliação e descreve allow_simulation, require_additional_confirmation ou interrupt_simulation. Inclui versão de política, versão de risco, pontuação, classificação, necessidade de confirmação adicional, disponibilidade de revisão e justificativa. Não realiza a ação descrita.
- `js/guard/scenarios.js`: quatro cenários imutáveis com expectativas explícitas de pontuação, classificação e ação. O rótulo educativo do falso positivo fica fora da entrada do motor.
- `js/guard/audit-log.js`: `createEvaluationRecord()` monta snapshot imutável com entrada normalizada, avaliação e decisão originais, versões, ID e data fornecidos pelo chamador. `appendReview()` valida o registro e devolve outro snapshot com revisão acrescentada. `getReviewStatus()` informa a ação original separadamente do resultado de revisão mais recente. Valida IDs, datas ISO UTC, cronologia, justificativas e duplicação de IDs de revisão. Funções auxiliares normalizam revisões e comparam snapshots sem mutar os argumentos.
- `js/guard/demo.js`: executável separado que imprime quatro avaliações e exemplo de revisão. É o único arquivo do módulo que escreve no console; os módulos de risco, política, cenário e auditoria não realizam IO.
- `js/guard/package.json`: declara apenas `type: module` e `private: true`, sem dependências. Seu escopo fica restrito à pasta, preservando a execução dos scripts antigos.
- `js/guard/README.md`: contrato, exemplos, comandos, regras e limitações.
- `tests/guard.test.mjs`: suíte isolada usando exclusivamente node:test e node:assert, sem frameworks adicionais.

### Critérios provisórios de risco e política

Pesos: newKey = 20; unfamiliar = 15; outlier = 25; behaviorChange = 20; internalAlert = 40; repeated = 15. São indicadores fornecidos explicitamente pelo cenário, não inferidos de dados transacionais. Não há leitura de saldo, relógio, histórico Pix ou serviços externos. A pontuação máxima é 135, não percentual ou probabilidade.

Menos de 30 pontos: low, permitir a simulação; 30–59: moderate, exigir confirmação adicional; 60 ou mais: high, descrever interrupção demonstrativa com opção de revisão. Nenhum indicador isolado alcança o limiar de interrupção. Os resultados são determinísticos e incluem `justec-guard-risk/0.1.0`; a política inclui `justec-guard-policy/0.1.0`. Alterações futuras dos critérios exigem novas versões.

| Cenário | Indicadores | Pontuação | Classificação | Decisão |
| --- | --- | ---: | --- | --- |
| Baixo | Nenhum | 0 | low | allow_simulation |
| Moderado | newKey, unfamiliar | 35 | moderate | require_additional_confirmation |
| Alto | newKey, unfamiliar, internalAlert | 75 | high | interrupt_simulation |
| Falso positivo | newKey, internalAlert | 60 | high | interrupt_simulation |

Duplicatas são normalizadas, não somadas novamente. Indicadores desconhecidos, tipos inválidos, arrays esparsos, modo real e campos extras são rejeitados. O motor não aceita pontuação ou pesos arbitrários fornecidos pelo chamador. A política também rejeita avaliações inconsistentes e versões desconhecidas.

### Auditoria e revisão sem reescrita da decisão

O registro usa `justec-guard-audit/0.1.0`. Não usa relógio ou aleatoriedade: identificadores e datas são parâmetros explícitos. A avaliação original permanece preservada após qualquer revisão. Revisões aceitam maintained ou withdrawn, identificador fictício do revisor, data e justificativa fictícia de 10 a 1000 caracteres. A mesma revisão não pode ser incluída duas vezes, nem anteceder a avaliação ou revisão anterior.

No falso positivo, o motor produz inicialmente 60/high/interrupção. A revisão acrescenta withdrawn sem reduzir a pontuação original nem substituir a decisão registrada. Isso demonstra a diferença entre avaliação automática e esclarecimento posterior. Não é implementada concessão de desbloqueio real, alteração no DICT ou autorização bancária.

Os snapshots são serializáveis em JSON e imutáveis em memória, mas não são um sistema de auditoria persistente ou inviolável. Sem assinatura, banco append-only ou controle de acesso, alguém com acesso aos dados pode reconstruir um histórico matematicamente coerente. A validação não equivale à verificação de autenticidade ou identidade do revisor. O suporte a regras antigas após uma futura atualização exige validadores por versão; atualmente versões desconhecidas são rejeitadas.

### Testes executados e resultados

Comando `node --test tests/guard.test.mjs`, executado em Node.js 24.19.0: **33 testes passaram, 0 falharam, 0 ignorados**. Foram verificados os quatro cenários; pontos 25, 30, 55, 60 e máximo 135; decisões esperadas; indicador isolado sem interrupção; deduplicação e ordem independente; justificativas; entradas inválidas; cenários congelados; ausência de mutação ou congelamento da entrada; avaliações adulteradas; versões inconsistentes; falso positivo e revisão; múltiplas revisões; serialização; metadados inválidos; cronologia; revisão duplicada; preservação da decisão original.

`node js/guard/demo.js`: executado com sucesso; saída contém os quatro cenários e o exemplo de revisão withdrawn mantendo interrupt_simulation como ação original.

Teste de regressão `JUSTEC_RESOURCE_BRIDGE=1 node tests/pix.cjs`: passou, sem erros JavaScript, validando Pix baixo/moderado/alto, confirmações, valores inválidos, saldo insuficiente, extrato/débito único, interrupções, revisões e reinício. O adaptador HTTPS de recursos é exclusivo do teste, já documentado na Etapa 5. Comparação Git confirmou que HTML, CSS, scripts do fluxo atual e testes anteriores não foram alterados nesta etapa.

Nenhuma instalação de dependências foi necessária. O motor não foi integrado à interface, não avalia pessoas ou chaves reais e não realiza transferências, autenticação, consulta externa ou coleta de biometria. Pontuação nunca é apresentada como comprovação de fraude.

### Execução isolada no VS Code e pendências

Abra a pasta do projeto e use o terminal integrado com Node.js 20 ou superior:

```sh
node js/guard/demo.js
node --test tests/guard.test.mjs
```

Não é necessário iniciar Live Server para esses comandos. O exemplo de importação ES module está em `js/guard/README.md`. O site continua usando o motor anterior; não existe integração oculta do novo módulo.

Pendência principal: receber a especificação citada e comparar contratos, pesos, limiares, decisões e estrutura de auditoria. Também ficam fora do escopo persistência, autenticação de revisores, proteção criptográfica, métricas de precisão, calibração estatística e integração com Pix. O material é experimental e acadêmico, sem validade operacional ou jurídica. Não houve avaliação de desempenho em escala nem testes em outras versões de Node; essas verificações não são declaradas aprovadas.


## Etapa 6 — Adequação à especificação recebida em Documentação.zip

### Referências e preservação de histórico

Recebidos e lidos `Documentação/JUSTEC_Guard_Etapa_6_Especificacao.md`, `Documentação/JUSTEC_Guard_Requisitos_Arquitetura_v1.md` e o relatório local do usuário. Os três arquivos foram extraídos para a pasta Documentação sem substituir o relatório da raiz. Os registros anteriores dos dois relatórios foram preservados. A pendência anterior de acesso à especificação está resolvida; as descrições provisórias da versão 0.1.0 permanecem apenas como histórico e são substituídas tecnicamente por este registro e pelo README atual.

### Correções realizadas conforme o documento

`js/guard/risk-engine.js` agora oferece `evaluateRisk(indicators)` recebendo array de códigos R01 a R06. Pesos: R01 chave recente 10; R02 sem relacionamento 10; R03 valor fora do padrão 20; R04 dispositivo incomum 15; R05 múltiplas tentativas 15; R06 alerta fictício 30. Soma explicitamente limitada a 100; faixas 0–29 low, 30–59 moderate, 60–100 high. Foram removidos desse módulo os nomes/pesos provisórios herdados da Etapa 5. A saída registra score, classification, indicadores com pesos/justificativas, justificativas gerais, versão e simulation: true. Os indicadores são definidos pelo cenário, sem consulta a chaves, dispositivos, DICT, Bacen ou dados reais.

`js/guard/policy-engine.js` foi ajustado para a função pura `decideAction(assessment)`: allow_simulation, require_additional_confirmation ou interrupt_simulation, com justificativa e versão. A avaliação é validada/reconstituída para impedir inconsistências de pontuação, classificação ou motivos. A política apenas descreve a decisão, sem executar bloqueios, transferências ou alterações na interface.

`js/guard/scenarios.js` contém os quatro cenários pedidos e o caso adicional de todos os indicadores: nenhum = 0/baixo/prosseguir; R01+R02+R03 = 40/moderado/verificação; R01+R03+R04+R05+R06 = 90/elevado/interrupção; todos = 100/elevado/interrupção; falso positivo R01+R03+R06 = 60/elevado/interrupção antes da revisão. O conhecimento educativo de legitimidade não é usado para reduzir o risco antecipadamente.

O arquivo provisório `audit-log.js` foi substituído pelo nome especificado `js/guard/audit.js`. `createEvaluationRecord()` exige evaluationId, transactionId e timestamp fictícios fornecidos pelo chamador. O registro contém os dados mínimos da arquitetura: evaluationId, transactionId, timestamp, riskLevel, indicators, policyVersion, decision, reasons e simulation: true, além de entrada normalizada, avaliação/decisão originais e revisões.

`appendReview()` cria outro snapshot e mantém a decisão original. `getReviewStatus()` informa separadamente a ação original e o resultado mais recente da revisão. Duplicações de revisão, datas inválidas/retroativas e registros inconsistentes são rejeitados. Uma revisão withdrawn não altera a decisão original interrupt_simulation. A retirada continua sendo apenas registro educativo; não produz desbloqueio ou reavaliação automática.

As versões de risco, política e auditoria passaram para 0.2.0 para distinguir o contrato correto do provisório. `demo.js`, `README.md` e `tests/guard.test.mjs` foram atualizados para as assinaturas, dados e nomes especificados. Não há alias ou integração silenciosa com o motor antigo. `package.json` continua apenas declarando ES modules na pasta, sem novas dependências.

### Pureza e proteção das entradas

O motor e a política são funções determinísticas, sem IO, DOM, relógio, rede ou acesso ao estado bancário. O executor demo.js escreve no console de forma explícita. Duplicatas de indicadores contam uma só vez; código desconhecido, valor inválido, envelope em vez de array ou lista esparsa produz TypeError controlado, sem pontuação silenciosa. Saídas são cópias profundamente congeladas; não há congelamento ou modificação de objetos fornecidos pelo chamador.

### Validação executada após o recebimento da especificação

`node --test tests/guard.test.mjs`: **39 testes passaram, 0 falharam, 0 ignorados**. Inclui os resultados mínimos 0, 40, 90 e 100; tabela exata de códigos/pesos; faixas nos pontos 30 e 60; deduplicação; indicador inválido; imutabilidade; consistência da política; dados mínimos de auditoria; revisões sucessivas; falso positivo preservando decisão original; serialização; cronologia; IDs duplicados; adulteração e versões desconhecidas. Teste adicional instala sentinelas que rejeitam acesso a bankState, document e localStorage e confirma que avaliação, política e criação de auditoria funcionam sem acessá-los.

`node js/guard/demo.js`: executado com sucesso, imprimindo os cinco cenários e o exemplo de revisão separado da decisão original.

A exigência de não descontar saldo nem emitir comprovante de Pix concluído ao interromper é respeitada estruturalmente: os módulos isolados não possuem nem chamam APIs de saldo, lançamento ou comprovante. O fluxo Pix permanece no motor da Etapa 5; sua regressão é verificada separadamente. Não se afirma que o novo motor esteja integrado ao Pix.

### Execução e limitações

No terminal integrado do VS Code, na raiz do projeto, executar `node js/guard/demo.js` e `node --test tests/guard.test.mjs`. Não é necessário npm install, Live Server ou backend para o motor. Exemplos de importação e auditoria estão em js/guard/README.md.

A auditoria é local em memória e serializável, sem persistência automática, assinatura criptográfica ou identidade real de revisores. A imutabilidade é lógica, não garantia contra reconstrução externa de históricos. Migração dos registros provisórios 0.1.0 não foi implementada; versões incompatíveis são rejeitadas. Não há avaliação empírica de precisão ou validade jurídica. Pontuação não é probabilidade nem prova de fraude. Chave, conta e operação permanecem objetos distintos; nenhuma medida real é executada. Integração futura, persistência e adaptações oficiais continuam fora do escopo desta etapa.

Resultado final da regressão após a adequação: `JUSTEC_RESOURCE_BRIDGE=1 node tests/pix.cjs` passou, sem erros JavaScript, incluindo preservação do saldo nas interrupções, lançamentos únicos e revisão de falso positivo. A comparação Git confirmou que HTML, CSS e todos os scripts do fluxo atual permanecem inalterados.


## Etapa 7 — Aplicação web responsiva

### Diagnóstico e arquivos

O layout estava limitado ao contêiner max-w-[400px], h-[850px], phone-frame, bordas/arredondamento externos, barra de status fictícia e indicador inferior de aparelho. O conteúdo usava overflow-y-auto dentro da altura fixa, concorrendo com a rolagem do navegador. Essa estrutura foi substituída por shell responsivo, sem reescrever as telas ou os módulos bancários.

Modificados: `index.html`, `css/style.css`, `js/app.js`, `tests/layout.cjs`, `tests/balance.cjs` e relatórios. O HTML recebeu landmarks header/main/nav, navegação lateral, atributos data-nav-screen, IDs dos cartões da Home e link de pular para o conteúdo. O logotipo passou a ser um link acessível para o início. Foram removidos os elementos simulados do dispositivo. A barra inferior continua no HTML para mobile. CSS e funções bancárias não foram duplicados para cada formato.

### Estratégia e breakpoints

- Base mobile: largura integral da tela, saldo acima dos serviços, Rota da Segurança abaixo, cabeçalho sticky e navegação inferior fixed. A área de conteúdo possui espaçamento inferior de 96px mais safe-area-inset-bottom para que as últimas ações não fiquem cobertas. Botões da aplicação têm alvo mínimo de 44px e navegação inferior de 48px.
- 640px: margens mais amplas e formulários/listas com largura de leitura limitada; serviços maiores.
- 768px: Home em duas colunas para saldo/serviços e Rota da Segurança em largura integral com duas ações lado a lado; resumo do extrato em três colunas. Tipografia e espaçamentos ampliados para tablet/desktop.
- 1024px: menu lateral de 232px substitui a barra inferior. Cabeçalho e lateral são sticky, e o conteúdo central usa a largura restante com máximo de 1520px, mantendo margens proporcionais em monitores grandes.
- 1600px: saldo, serviços e segurança passam a ocupar três colunas. A Rota da Segurança volta a dispor suas ações verticalmente dentro do cartão.

A paleta azul-escuro/amarelo, Plus Jakarta Sans, Font Awesome e cartões arredondados foram preservados. O limite central é para leitura e distribuição de dashboard, não uma moldura ampliada de smartphone.

### Navegação e rolagem

`navigateTo()` continua sendo a função compartilhada de troca de tela. `syncNavigation(screenId)` atualiza ambos os menus usando data-nav-screen e aria-current="page", sem duplicar estado. No desktop cada tela tem entrada própria. No mobile, Extrato destaca Início; Proteção, Revisões, Central e Centro educativo destacam Triagem como seção relacionada. Pix chama a função existente openPixFlow em ambos os formatos. A seleção permanece coerente ao redimensionar sem reinicializar saldo ou cenário.

A área app-content deixou de ter altura fixa, overflow interno e barra de rolagem escondida. A página usa a rolagem natural do documento em todos os formatos. Navegar reinicia a rolagem da janela. Cabeçalho/lateral mantêm contexto, e o rodapé mobile respeita a área segura do dispositivo. Modais têm altura máxima pela viewport e rolagem própria somente enquanto abertos; o documento é bloqueado nesse período, evitando rolagens concorrentes. O comprovante fica centralizado com largura máxima de 560px.

### Testes executados e resultados

`JUSTEC_RESOURCE_BRIDGE=1 node tests/layout.cjs`: passou em **360, 390, 768, 1024, 1366 e 1920px**, com altura de 900px. Em cada largura, foram exercitadas por cliques as telas Início, Pix, Extrato, Central de segurança, Pós-golpe, Proteção, Revisões e Direitos. Asserções verificaram uma única tela ativa, navegação correta, destaque sincronizado nos dois menus, largura real do shell, aproveitamento horizontal desktop, ausência de overflow horizontal, ausência de overflow-y scroll/auto no conteúdo e acessibilidade dos últimos botões acima da barra mobile. Verificados também modal de diagnóstico e comprovante dentro da viewport, fechamento e saldo oculto preservado entre formatos. Resultado: seis larguras, oito telas por largura e dois modais por largura, sem erros JavaScript.

Capturas de Home em 390, 1366 e 1920px foram inspecionadas visualmente: mobile preserva ordem dos elementos e identidade; desktop usa menu lateral e cartões distribuídos em colunas, sem aparelho simulado. As capturas das seis larguras são geradas em /tmp/justec-responsive-<largura>.png durante o teste, sem garantia de retenção em outras máquinas.

Regressões executadas: `tests/pix.cjs` passou (baixo/moderado/alto, confirmações, valores inválidos, saldo insuficiente, débito/extrato único, interrupções, revisão e reinício); `tests/statement.cjs` passou (filtros, totais, detalhes, clipboard, modais e contestação educativa); `tests/balance.cjs` passou (ocultação, ícones, navegação, triagem e MED). Os três usaram JUSTEC_RESOURCE_BRIDGE=1 para carregar os recursos oficiais via HTTPS pelo adaptador de teste previamente documentado, sem desativar TLS. Não foram observados erros JavaScript nas execuções finais.

`node --test tests/guard.test.mjs`: **39 aprovados, 0 falhas, 0 ignorados**. `node --check js/app.js` e verificação de espaços/diff passaram. Comparação Git confirmou ausência de alterações em js/pix.js, js/state.js, js/risk.js, js/transactions.js e js/guard: motores e regras não foram alterados nem integrados pela responsividade.

### Problemas encontrados e soluções

A regressão antiga tentava clicar na barra mobile com a viewport desktop padrão, onde ela agora está intencionalmente oculta. O teste foi configurado para 390px; o comportamento desktop é coberto pela nova suíte de layout com cliques no menu lateral. O seletor antigo do acesso educativo também precisava distinguir o cabeçalho da nova entrada lateral; foi limitado à app-header. Nenhuma funcionalidade foi desativada para fazer os testes passarem.

Os antigos estilos phone-frame e restrições de 400x850 foram removidos. A lógica antiga que substituía classes de um único menu foi trocada por aria-current compartilhado; os estilos de estado não dependem de cada função bancária. A nova navegação não reinicia o saldo ao trocar apenas o tamanho da janela.

### Validação local, publicação e limitações

No VS Code, abrir index.html com Live Server. No modo responsivo do navegador, testar as seis larguras citadas, acessar menus/serviços, ocultar saldo, navegar ao extrato, simular Pix, consultar Proteção/Revisões e abrir orientações MED. Rolar até os últimos controles e conferir que o rodapé mobile não os cobre. Alternar desktop/mobile sem recarregar para conferir estado e destaque.

Na configuração existente, enviar o commit para a branch main do GitHub aciona o deploy automático conectado à Vercel. Acompanhar o status Vercel do commit e conferir o endereço público após a conclusão; se houver cache, recarregar sem cache. Publicação não integra o motor experimental ao Pix.

As verificações foram executadas em Chromium headless com servidor HTTP estático; a extensão Live Server em si não foi executada. Não foram testados dispositivos físicos, Safari/Firefox, leitor de tela, ampliação de texto em 200% ou todas as alturas/orientações possíveis. O uso de safe-area e prefers-reduced-motion está implementado, mas não foi validado em aparelho real. Recursos visuais continuam dependendo de CDNs. Recomenda-se uma rodada posterior de acessibilidade e dispositivos físicos. A aplicação permanece demonstrativa, sem operações financeiras reais.


## Revisão de publicação e atalhos após a Etapa 7

Verificada a igualdade entre HEAD local e a branch main no GitHub antes desta revisão; o commit responsivo 43dbf3b estava com Deployment has completed na Vercel. A abertura direta de https://justec-bank.vercel.app por este ambiente falhou no túnel de rede (403, sem resposta HTTP do site), portanto não é declarada validação funcional direta em produção.

Corrigida uma ambiguidade de navegação: Segurança no cabeçalho abria o centro educativo em vez da Central de segurança. Agora o cabeçalho abre a Central, com ícone de escudo, e ela mantém acesso explícito ao Centro educativo tanto em mobile quanto desktop. Os seis serviços da Home e os acessos ao extrato, triagem, pós-golpe, Direitos e Guia MED foram preservados. Verificar chave Pix e Bloqueios preventivos compartilham intencionalmente a tela Proteção de Chaves Pix, que apresenta avaliações e status das restrições fictícias. Contestações abre a central de revisão de restrições; contestações educativas de movimentações continuam acessíveis pelos detalhes do extrato.

Criado tests/shortcuts.cjs: **49 verificações passaram** em 390 e 1366px com cliques reais nos serviços da Home, cabeçalho, Central e seus cinco destinos, Rota da Segurança, extrato, Direitos/MED e menus mobile/desktop. Nenhum erro JavaScript observado. Atualizado o teste de saldo para alcançar o centro educativo pelo caminho corrigido. Arquivos funcionais alterados nesta revisão: somente index.html.

Reexecutados e aprovados: tests/pix.cjs (confirmações, risco baixo/moderado/elevado, saldo insuficiente, valores inválidos, débito único, tentativas sem débito e revisões); tests/statement.cjs (filtros, totais, comprovante, cópia e contestação); tests/balance.cjs (saldo, navegação, triagem e MED); tests/layout.cjs nas seis larguras 360/390/768/1024/1366/1920; e os **39 testes isolados do Guard**, sem falhas. Testes de navegador usaram o adaptador HTTPS de recursos já documentado. A matriz de layout verificou oito telas e dois modais por largura, sem sobreposição/overflow horizontal. Não foram alteradas regras dos motores nem foi integrado o motor experimental ao Pix.

As verificações de funcionalidade continuam sendo locais em Chromium headless; não equivalem a validação de todos os dispositivos, navegadores ou do domínio público. O deploy é confirmado pelo status da integração Vercel no GitHub. Para conferência independente, abrir o endereço público em navegador autorizado e testar os atalhos e fluxos após recarregar sem cache.


## Correção de regressões de conteúdo e identidade de chave Pix

### Problema reportado e investigação

O usuário apontou que a tela explicativa do mecanismo de proteção Pix voltava a orientar bloqueio de conta. A inspeção confirmou que a explicação acrescentada na Etapa 5 coexistia com o checklist legado “Bloqueio Preventivo da Conta”. A busca no histórico Git mostrou que o checklist já vinha do primeiro commit importado, não foi reintroduzido pela responsividade: a falha foi deixá-lo junto do conteúdo novo. Os testes anteriores verificavam comportamento e navegação, mas não essa contradição semântica. Esta correção amplia a cobertura de conteúdo, sem apagar os registros anteriores de validação.

### Conteúdo corrigido

`index.html`: a página agora se intitula “Como funciona a proteção do Pix”. O checklist legado foi removido e substituído por quatro explicações: análise e ação por risco, interrupção de uma tentativa versus restrição interna do destinatário/chave, preservação do saldo e histórico separado de tentativas, e revisão de restrição indevida. A página afirma que a conta do usuário e o DICT não são bloqueados pelo protótipo. Foram incluídos acessos diretos a Proteção de chaves, histórico na Central e Revisões.

As orientações sobre golpe real e MED foram preservadas em uma seção separada, sem recomendação genérica de bloquear conta/cartões e sem promessa de retenção ou devolução. Em Direitos, o texto antigo que equiparava MED a bloqueio de contas de estelionatários foi substituído por explicação de avaliação pelo banco, sem restituição garantida ou bloqueio universal de chaves. Em `js/app.js`, o roteiro MED deixou de pedir abertura automática com uma referência normativa não verificada; passou a ser exemplo de relato e solicitação de avaliação pelo canal oficial, esclarecendo que o protótipo não enviou pedido algum.

### Outro defeito reproduzido e corrigido

A revisão do fluxo revelou que uma chave digitada recebia um novo ID CUSTOM a cada conferência. Reprodução antes da correção: a mesma chave fictícia repeticao@example.invalid foi interrompida no cenário elevado com ID CUSTOM-3; digitada novamente no cenário baixo, virou CUSTOM-6 e avançou como baixo risco. Isso contornava a identidade do destinatário usada pela política de restrições.

`js/pix.js`: preparePix agora identifica a chave localmente por impressão SHA-256 e reutiliza o destinatário da sessão. Apenas a impressão e a representação mascarada são mantidas; a chave completa não fica armazenada no estado, e nenhum serviço externo é consultado. A normalização trata diferenças de maiúsculas em e-mail/UUID e pontuação numérica. Selecionar outro cenário pode alterar os indicadores, mas não apaga a restrição interna ativa ligada àquela chave. O hash serve à identidade fictícia local, não autentica titularidade nem garante anonimização de dados reais. A interface continua instruindo o uso exclusivo de dados fictícios.

A identificação usa Web Crypto nativa, sem dependências. Em origens sem crypto.subtle, a interface informa a necessidade de HTTPS/localhost ou oferece os destinatários prontos; não cria um novo ID inseguro como alternativa. O contador pixPreparation invalida resultados assíncronos obsoletos se os campos mudarem durante a identificação. A sessão ainda é reiniciada por recarga; não há persistência. Motor da Etapa 5, estado financeiro, dados iniciais e motor experimental isolado da Etapa 6 não foram substituídos ou integrados nesta correção.

### Testes executados

Criado `tests/guard-content.cjs`: passou em 390 e 1366px. Verifica quatro explicações do mecanismo, ausência do checklist antigo, conta/DICT distintos da operação, preservação de saldo e ausência de comprovante em interrupções, sequência de revisão, orientações MED em seção separada, atalhos funcionais e roteiro sem pedido enviado. Também executa uma interrupção no simulador e confirma saldo/quantidade do extrato inalterados, tentativa registrada separadamente e comprovante oculto. Captura corrigida inspecionada em `/tmp/justec-guard-guide-corrected.png`.

Ampliado e reexecutado `tests/pix.cjs`: passou com repetição da mesma chave em caixa diferente e mudança de cenário elevado para baixo. Verificou mesmo ID de destinatário, interrupção mantida, nenhuma alteração no saldo/extrato, incremento de tentativa e ausência de comprovante. Teste adicional segurou a resposta do digest local, alterou o valor e liberou a resposta: a conferência antiga foi descartada, sem criar outro destinatário ou rascunho. Os cenários anteriores de aprovação, risco moderado/elevado, saldo insuficiente, valores inválidos, revisão de falso positivo e reinício continuaram passando. Nenhum erro JavaScript observado.

Também reexecutados e aprovados nesta revisão: tests/statement.cjs; tests/balance.cjs; 49 verificações de tests/shortcuts.cjs; tests/layout.cjs em 360, 390, 768, 1024, 1366 e 1920px; e os 39 testes isolados de tests/guard.test.mjs. Após a mudança assíncrona, a suíte Pix ampliada e as verificações de conteúdo/layout foram novamente concluídas. Testes de navegador usaram o adaptador HTTPS de recursos documentado, sem desativar TLS. Verificação de sintaxe e diff passaram.

### Limites e publicação

A auditoria encontrou e corrigiu as contradições de conteúdo e o defeito de identidade acima; não é garantia de ausência de qualquer outro defeito. Os cenários executados não mostraram outras regressões funcionais. A validação foi local em Chromium, não em todos os navegadores ou dispositivos físicos. A integridade jurídica das normas Pix não foi revisada neste trabalho: a redação foi mantida genérica e demonstrativa. O motor da Etapa 6 continua isolado, conforme solicitado.

O commit corretivo é enviado à branch main e seu deploy automático é acompanhado pelo status Vercel. A rede do ambiente continua limitando verificação direta do domínio público; confirmação de deploy não equivale a teste funcional direto em produção.


## 20/10/2026 — Refinamento responsivo baseado no código atual (sem publicação)

### Inspeção e comparação dos relatórios

A inspeção confirmou que o diagnóstico de moldura de 400x850 descrevia uma versão anterior: o código atual já usava app-shell, menu lateral, barra mobile e rolagem natural, implementados na Etapa 7. Não foi necessário refazer a arquitetura. Os dez destinos são Home, Pix, Extrato, Proteção, Revisões, Central, Triagem, Pós-golpe, Direitos e Centro educativo.

Os dois relatórios foram comparados antes da atualização. Este arquivo da raiz agrega o histórico principal de implementação, testes, correções e decisões desta colaboração, desde a correção da Etapa 3. Documentação/RELATORIO_MESTRE_JUSTEC.md começa com os Registros 001–003 do desenvolvimento local original do usuário e preserva sua origem documental, além de registros posteriores compartilhados. Os arquivos não são cópias intercambiáveis e nenhum foi substituído pelo outro. Somente este relatório principal recebeu o presente acréscimo; o arquivo em Documentação permaneceu byte a byte intacto. Todos os registros anteriores deste arquivo foram preservados integralmente.

### Alterações incrementais e arquivos

- index.html: removido exclusivamente o bloco CSS inline duplicado. Antes de remover, a equivalência de todas as regras com o início de css/style.css foi conferida desconsiderando espaços. O script inline de configuração Tailwind permanece. Nenhum ID, onclick, tela, conteúdo educativo, modal, diálogo ou formulário foi removido ou remapeado.
- css/style.css: as regras visuais agora ficam somente no arquivo externo. Adicionado scroll-padding-bottom compatível com a navegação fixa e margem de rolagem nos controles; em desktop o espaçamento inferior de rolagem é reduzido a 24px. Em larguras até 374px, os seis serviços usam duas colunas para evitar a quebra excessiva dos nomes em cartões estreitos. A partir de 375px, mantêm três colunas.
- tests/layout.cjs: matriz ampliada para 320, 375, 390, 768, 1024, 1366 e 1920px e todas as dez telas. Acrescentadas verificações de campos, mensagens de erro do Pix e número de colunas dos serviços.
- tests/balance.cjs: passou a aceitar JUSTEC_TEST_URL, como as outras suítes, permitindo usar o servidor de teste escolhido sem alterar a aplicação. Não foram removidas as verificações existentes.
- RELATORIO_MESTRE_JUSTEC.md: este registro, apenas por acréscimo.

Os módulos js/transactions.js, js/state.js, js/risk.js, js/app.js, js/pix.js e todos os módulos de js/guard permanecem byte a byte iguais ao início da tarefa, comprovado por SHA-256. O cálculo do saldo, as regras de risco e o fluxo transacional não foram alterados. Não houve instalação de framework ou biblioteca, duplicação de navegação ou mudança de estado compartilhado.

### Estratégia responsiva preservada

Mobile: largura real da tela, saldo acima dos serviços e Rota da Segurança, barra inferior fixa e conteúdo com espaço para rolar além dela. Até 374px, serviços em duas colunas; a partir de 375px, três. A rolagem do documento respeita as margens do cabeçalho e da barra inferior ao alinhar controles.

Tablet: a partir de 640px, margens e larguras de leitura maiores; a partir de 768px, Home em duas colunas, com a Rota da Segurança ocupando a largura da grade e resumo do extrato em colunas.

Desktop: a partir de 1024px, navegação lateral de 232px, barra mobile oculta e conteúdo com largura máxima de 1520px. A partir de 1600px, saldo, serviços e segurança ficam em três colunas. O documento mantém rolagem natural, sem overflow interno em app-content. Somente modais/diálogos podem rolar internamente durante sua abertura. Ambos os menus usam navigateTo/syncNavigation e o mesmo estado existentes.

### Problema encontrado na ampliação da cobertura

A matriz anterior não incluía 320px e cobria apenas oito telas. No primeiro teste a 320px, a parte inferior do último botão da Home ficava cerca de 6px atrás da barra inferior quando a página ainda estava no topo. O documento já tinha espaço inferior para torná-lo acessível por rolagem, mas scrollIntoViewIfNeeded não reconhecia a sobreposição por um elemento fixo e não rolava. Foram adicionadas margens de rolagem e o teste agora alinha explicitamente o último controle ao fim da área segura antes de medir sua acessibilidade. Isso valida acesso por rolagem, sem exigir que todo o conteúdo de uma página longa caiba simultaneamente na viewport.

A inspeção visual também mostrou quebra excessiva de “movimentações” na grade de três colunas a 320px. O breakpoint de duas colunas para essa largura resolveu o estreitamento sem reduzir textos, esconder serviços ou modificar seus vínculos. O número de colunas é verificado na suíte.

### Testes realizados

Executados em Chromium headless, altura de 900px, servidor HTTP estático em 127.0.0.1:8765. Como já documentado, JUSTEC_RESOURCE_BRIDGE=1 repassa recursos das CDNs oficiais via curl com HTTPS/TLS verificado exclusivamente durante os testes; a aplicação mantém suas URLs normais.

- tests/layout.cjs: matriz de sete larguras e dez telas, incluindo Triagem e Centro educativo. Verificou navegação por botões, destaque ativo nos dois menus, estado do saldo preservado entre formatos, uma única tela ativa, ausência de rolagem horizontal, ausência de overflow-y scroll/auto no conteúdo, largura do shell e uso horizontal desktop. Também verificou campos dentro da largura da viewport e fora do cabeçalho/barra inferior, mensagem de valor inválido do Pix visível e desobstruída, últimos botões alcançáveis por rolagem e dois tipos de modal por largura. As capturas são geradas em /tmp/justec-responsive-<largura>.png.
- tests/balance.cjs: passou, incluindo alternância, ícones, nomes acessíveis, navegação, triagem, MED e recarga. Nenhum erro JavaScript.
- tests/statement.cjs: passou, incluindo filtros, totais, detalhes, cópia e falha de cópia, fechamento de diálogo e orientações educativas. Nenhum erro JavaScript.
- tests/pix.cjs: passou, incluindo cenários de risco, valores inválidos, saldo insuficiente, débito único, extrato, interrupções sem débito, revisão/falso positivo, repetição da mesma chave com cenário diferente e cancelamento de conferência assíncrona obsoleta. Nenhum erro JavaScript.
- Comparação de integridade: todos os módulos JavaScript, sequência de IDs e atributos onclick preservados; relatório de Documentação intacto; histórico anterior do relatório principal preservado.

As capturas de 320px e 1366px foram inspecionadas; o refinamento de duas colunas foi aplicado após observar a quebra de nomes a 320px e a matriz foi novamente executada para validar a versão final.

### Validação local e limitações

Abrir index.html pelo Live Server e usar o modo responsivo do navegador nas sete larguras indicadas. Conferir Home, Pix, Extrato, Central, Pós-golpe, Proteção, Revisões, Direitos, Triagem e Centro educativo; rolar até os controles finais; abrir alertas/comprovantes; ocultar/revelar saldo e repetir os cenários Pix. Para repetir os testes com Playwright/Chromium já disponíveis, usar JUSTEC_RESOURCE_BRIDGE=1 JUSTEC_TEST_URL=http://127.0.0.1:8765/ node tests/layout.cjs, trocando o endereço pelo servidor em execução. A mesma variável de URL funciona nas três suítes funcionais reutilizadas.

A extensão Live Server não foi executada nesta máquina; foi usado servidor HTTP estático equivalente. Não foram testados aparelhos físicos, Safari/Firefox, leitor de tela, zoom de 200%, todas as alturas/orientações ou safe areas em iPhone real. As CDNs continuam sendo dependência visual. A validação automatizada não comprova ausência absoluta de falhas. Nenhum problema transacional novo foi observado nos cenários executados.

Não houve commit enviado ao GitHub nem publicação na Vercel: o push em main acionaria deploy automático e foi evitado conforme a instrução explícita desta tarefa. As alterações permanecem locais para revisão.

Resultado final da matriz ampliada: as 70 combinações de largura/tela e as 14 verificações de modais passaram, sem erros JavaScript. A inspeção final confirmou a preservação dos módulos e dos dois históricos.

## 20/10/2026 — Validação, publicação autorizada e documento de recomendações

O usuário autorizou publicar o refinamento responsivo antes mantido local e pediu avaliação das funcionalidades e um documento para continuar a discussão no ChatGPT. Reexecutadas as sete suítes: layout (sete larguras, dez telas, 70 combinações e 14 verificações de modais), saldo, extrato, Pix, atalhos (49 verificações), conteúdo Guard e unidade do motor isolado (39 testes). Todas concluíram com código 0; nenhum erro JavaScript registrado nas execuções finais dos testes de navegador. Os testes usaram o servidor local na porta 8765 e o adaptador HTTPS de recursos já documentado.

O refinamento responsivo foi enviado à main no commit 07dcecd. O status da integração Vercel retornou success / Deployment has completed. A confirmação de deploy é distinta da navegação funcional direta no domínio público, ainda limitada pelo acesso de rede deste ambiente.

Foram realizadas sondagens adicionais em contextos descartáveis, sem alterar a lógica de negócio ou os dados da aplicação publicada. Achados: recordApprovedPix aceita NaN em chamada programática direta, corrompendo o saldo desse contexto de teste; uma retirada anterior de restrição faz o motor antigo ignorar inclusive flags posteriormente adicionados; a listagem de proteção calcula risco para R$ 50,00 e pode diferir do risco de uma operação de R$ 1.500,00; o modal de diagnóstico não tem semântica completa de diálogo nem fecha por Escape. Os fluxos normais da interface continuaram aprovados. Essas limitações não foram corrigidas silenciosamente nesta entrega: foram registradas como prioridades para trabalho posterior, distinguindo defeitos confirmados de propostas.

Criado Documentação/DIAGNOSTICO_E_PLANO_JUSTEC_2026-10-20.md, autocontido para envio ao ChatGPT, com arquitetura atual, matriz de testes, evidências, prioridades, critérios de aceitação, referências doutrinárias/normativas/jurisprudenciais a confirmar e prompt de continuidade. Foi gerada uma versão Word correspondente em /workspace/entregas/DIAGNOSTICO_E_PLANO_JUSTEC_2026-10-20.docx, reaberta e conferida estruturalmente, com cinco tabelas. Não houve renderização de paginação em suíte de escritório nesta máquina.

Tentativas de acesso online a Planalto, Banco Central, STJ, W3C e OWASP foram bloqueadas pela rede. O documento explicita que as referências externas não foram lidas com sucesso nesta sessão. Referências bibliográficas, súmulas e o REsp indicado para pesquisa não são apresentados como citações literais, inteiro teor conferido ou parecer jurídico atualizado. A verificação oficial da vigência e pertinência continua pendente.

O relatório de Documentação/ não foi alterado. O motor experimental continua isolado do Pix, e as recomendações não equivalem a funcionalidades implementadas. A publicação adicional deste diagnóstico e deste registro não altera a lógica bancária. O estado de cada entrega e suas limitações são informados separadamente ao usuário.

## 20/10/2026 — Integridade do núcleo transacional: validação de domínio

### Escopo e inspeção

Implementada exclusivamente a correção de validação de operações aprovadas em js/state.js, conforme solicitação. Inspecionados recordApprovedPix(), getter de saldo, demoId(), demoDate(), recordInterruptedPix(), dados iniciais e os chamadores preparePix()/completePix(). A interface envia amount como number em reais e destinatário com id/nome; os campos adicionais de etapa/risco permanecem fora do contrato financeiro desta função.

Arquivos alterados: js/state.js; criado tests/state-invariants.cjs; este relatório principal atualizado somente por acréscimo. Não foram alterados index.html, css/style.css, js/app.js, js/pix.js, js/risk.js, js/transactions.js, módulos js/guard ou o relatório de Documentação/. As funções demoId(), demoDate(), recordInterruptedPix() e o getter de saldo foram preservados. Não houve integração do motor experimental, mudança de pesos ou publicação.

### Defeito e causa técnica

A implementação original verificava somente amount <= 0 ou amount > balance. Comparações com NaN não satisfazem nenhuma dessas condições, permitindo criar um lançamento inválido e contaminar o saldo derivado. Coerções de tipo e arredondamento posterior também podiam aceitar strings, booleanos e frações de centavo. Não havia validação completa do rascunho/destinatário. Além disso, o retorno por ID duplicado ocorria antes da validação, aceitando reenvios inconsistentes como se fossem idempotentes.

### Contrato adotado

A API permanece compatível com a interface: recordApprovedPix({ id, amount, recipient: { id, name }, ...outrosCampos }). Não foi criado um segundo parâmetro monetário nem exigida alteração de js/pix.js.

- Rascunho e destinatário são objetos simples de dados; os campos obrigatórios devem ser propriedades próprias, não getters/setters. Isso evita executar acessores durante a validação. Campos extras usados pela interface não são lidos nem rejeitados.
- id da operação, id do destinatário e nome são strings não vazias/não compostas apenas de espaços. Não há coerção nem geração automática de identificador nesta função.
- amount deve ser number primitivo finito, estritamente positivo, canônico em BRL com precisão máxima de centavos. Rejeitados NaN, infinitos, strings, null, undefined, booleanos, BigInt, Number encapsulado, zero, -0, negativos e frações de centavo.
- pixAmountInCents() calcula Math.round(amount * 100), exige Number.isSafeInteger e confere a igualdade exata amount === cents / 100. O arredondamento serve para reconhecer a representação binária de valores válidos como 0.29 e 1.15, não para aceitar silenciosamente 1.001 ou 0.1 + 0.2. Resultados não canônicos de cálculos devem ser normalizados pelo chamador antes da fronteira de domínio.
- Comparação de disponibilidade feita em centavos inteiros. O saldo disponível também deve ser finito, não negativo e representar centavos seguros; zero é admitido para o saldo, não para uma nova transferência.
- O lançamento continua contendo amount negativo em reais, preservando o formato do extrato e o getter existente. Não se mantém uma segunda cópia mutável do valor em centavos.
- Nenhum novo limite de negócio foi introduzido. O limite demonstrativo de R$ 2.000,00 permanece no formulário/fluxo atual; o contrato desta função valida valor e saldo. Isso permite testar a quitação integral do saldo pela API de domínio sem mudar o comportamento da interface.

### Implementação e atomicidade

validateApprovedPix() lê apenas os campos próprios de dados, valida tipos/identificação/destinatário e devolve os valores primitivos validados e amountCents. recordApprovedPix() só modifica o estado depois de validar o contrato, resolver idempotência/colisão, conferir a disponibilidade e montar o lançamento completo.

Entradas rejeitadas não geram IDs, não incrementam sequence, não alteram saldo, transações, tentativas, restrições ou históricos e não substituem as coleções existentes. A função não tenta reparar silenciosamente estado previamente corrompido: para uma nova operação, saldo já inválido produz rejeição sem acrescentar lançamento.

O participante dos novos lançamentos também passa a guardar id, além dos campos já existentes name/institution. Isso permite conferir a identidade do destinatário durante reenvios sem depender só do nome visível e sem compartilhar o objeto recipient do rascunho. Não foram adicionados dados bancários ou chaves completas ao lançamento.

### Duplicidade e colisões

Depois da validação completa do rascunho, um ID existente só é tratado como reenvio idempotente se corresponder a Pix de saída concluído, mesmo valor, mesmo ID de destinatário e mesmo nome. Nesse caso, devolve o ID original sem novo débito, data ou alteração de estado. Essa conferência ocorre antes da disponibilidade para permitir repetir uma operação que já consumiu todo o saldo.

Mesmo ID com dados divergentes ou incompletos é rejeitado. IDs de movimentações iniciais não são reaproveitados para criar outro Pix. Registros antigos sem identidade de participante verificável não são presumidos equivalentes. O cenário atual reinicia por recarga e não possui persistência de sessões antigas; migração de registros persistidos não foi necessária nem implementada.

### Testes de regressão antes da correção

O arquivo tests/state-invariants.cjs foi criado e executado antes de alterar js/state.js. A primeira suíte tinha 56 testes: 17 passaram e 39 falharam. As falhas incluem o defeito monetário e os requisitos adicionais de contrato/idempotência; não representam 39 defeitos independentes.

O teste específico “Rejeita NaN sem alterar saldo, transações, IDs ou históricos” falhou no comportamento original porque o lançamento modificava o snapshot do estado. A cópia original foi preservada em /tmp/justec-state-before.js. Depois da correção, o mesmo teste isolado foi executado contra as duas implementações:

```text
Original:  tests 1, pass 0, fail 1, exit 1
Corrigida: tests 1, pass 1, fail 0, exit 0
```

### Resultados finais executados

A suíte foi ampliada com recuperação após rejeição e lançamentos sucessivos. A comparação final usou o mesmo arquivo de 58 testes contra a cópia original e a versão corrigida:

```text
Cópia original:  tests 58, pass 18, fail 40, exit 1
Versão corrigida: tests 58, pass 58, fail 0, exit 0
```

A suíte usa somente node:test, node:assert, node:vm e fs/path. Cada teste roda em contexto descartável com dados iniciais reais do projeto e históricos/sequence preexistentes. Compara snapshots integrais do estado e cenário, além da identidade das coleções. Não há dependência adicional nem mutação dos dados do site publicado.

Casos cobertos: valores não finitos e tipos inválidos; precisão inválida; centavos e valores BRL canônicos como 0.01, 0.07, 0.29, 1.15 e 350.35; saldo insuficiente; esgotamento exato do saldo; objetos/campos ausentes ou inválidos; reenvio idêntico inclusive com saldo zero; colisões de ID/valor/destinatário/nome; NaN e objeto incompleto com ID já usado; ID inicial indevidamente reutilizado; saldo previamente inválido; entrada congelada; snapshot independente do destinatário; rejeição de acessor sem executá-lo; operação válida após rejeição; e sequência de 0.10 + 0.20 + 0.29 em lançamentos distintos, com saldo esperado de R$ 2.479,91.

Regressões obrigatórias reexecutadas e concluídas com código 0:

- tests/balance.cjs: saldo, visibilidade, ícones, nomes acessíveis, navegação, triagem, MED e reinício.
- tests/statement.cjs: filtros, totais, detalhes, clipboard/falha, diálogo, contestação educativa e estado vazio.
- tests/pix.cjs: Pix baixo/moderado/elevado, confirmações, limites/valores inválidos, saldo insuficiente, débito único, extrato, tentativas sem débito, revisão, identidade de chave repetida e cancelamento de conferência obsoleta.

Nenhum erro JavaScript foi registrado nessas três suítes de navegador. Executadas em Chromium com servidor local 127.0.0.1:8765 e JUSTEC_RESOURCE_BRIDGE=1, adaptador HTTPS já documentado. Não foi desativada verificação TLS. A extensão Live Server não foi executada; foi usado servidor HTTP estático equivalente. Testes de layout ou de outros navegadores não foram reexecutados, pois nenhuma regra visual ou navegação foi modificada.

node --check js/state.js e git diff --check passaram. SHA-256 confirmou que os arquivos fora do escopo funcional, incluindo interface, Pix, riscos e Guard, permanecem intactos. O histórico anterior deste relatório e o relatório em Documentação/ foram preservados.

### Como reproduzir e revisar

Na raiz do projeto, com Node disponível:

```sh
node --test tests/state-invariants.cjs
```

Para reconstruir a implementação original do commit-base e repetir a comparação, em shell compatível com Unix:

```sh
git show cfc4099:js/state.js > /tmp/justec-state-original.js
JUSTEC_STATE_FILE=/tmp/justec-state-original.js node --test tests/state-invariants.cjs
node --test tests/state-invariants.cjs
```

O comando com a implementação original deve falhar; isso comprova a regressão, não é uma falha remanescente da versão corrigida. Os arquivos TAP desta execução estão em /tmp/justec-state-before.tap, /tmp/justec-state-final-vs-original.tap, /tmp/justec-state-final.tap, /tmp/justec-state-nan-before.tap e /tmp/justec-state-nan-after.tap; são evidências temporárias e podem não persistir em outra máquina.

Para as regressões de navegador, iniciar o servidor HTTP e executar os três testes com JUSTEC_TEST_URL=http://127.0.0.1:8765/ e JUSTEC_RESOURCE_BRIDGE=1 quando necessário para as CDNs. No PowerShell, configurar as variáveis por $env: e adaptar o caminho temporário; o teste unitário principal não exige navegador ou servidor.

### Estado de entrega e limites

Correção pronta para revisão e publicação posterior, com os testes descritos aprovados. Não houve commit, push ou publicação automática na Vercel nesta tarefa. O diagnóstico anterior do valor NaN fica resolvido por esta alteração local; outras recomendações do diagnóstico continuam pendentes e fora do escopo.

Esta é validação de domínio de um protótipo cliente: não constitui autenticação, autorização bancária ou defesa contra alguém que controle o JavaScript/global state no próprio navegador. A função não passou a executar análise de risco nem autenticação; esses fluxos permanecem como antes. Nenhuma transferência, bloqueio ou integração financeira real foi implementada.


## Reorganização da Home — Rota da Segurança antes do saldo

A pedido do usuário, o bloco home-security foi movido no HTML para antes de home-balance. A ordem de leitura, foco e exibição mobile agora é Rota da Segurança, Saldo e Serviços Bancários, mantendo todos os IDs, conteúdos e ações. No tablet/desktop, a Rota ocupa a primeira linha inteira; saldo e serviços continuam organizados abaixo em colunas. Em monitores a partir de 1600px, Serviços ocupa as duas colunas restantes para evitar uma célula vazia.

Alterados nesta solicitação index.html, css/style.css e tests/layout.cjs. A suíte passou nas sete larguras 320/375/390/768/1024/1366/1920, dez telas e dois modais por largura, sem erros JavaScript. Foram acrescentadas asserções da ordem real do DOM e da posição visual da Rota acima do saldo. O servidor anterior não respondeu; a validação foi concluída com servidor HTTP local na porta 8770. A correção anterior de domínio em js/state.js e seus testes locais foram preservados. Não houve commit, push ou publicação na Vercel.

## Publicação autorizada — Núcleo transacional e ordem da Home

O usuário autorizou enviar ao GitHub e publicar as alterações locais, substituindo a restrição de publicação das solicitações anteriores. Foram reexecutados os 58 testes de invariantes do estado, todos aprovados, e as suítes de saldo, extrato, Pix e layout, todas concluídas com código 0 e sem erros JavaScript. A matriz de layout confirmou Rota da Segurança antes do saldo nas sete larguras 320/375/390/768/1024/1366/1920, cobrindo dez telas e dois modais por largura. Testes locais em Chromium, com servidor HTTP na porta 8770 e adaptador HTTPS de recursos já documentado.

A entrega inclui validação de domínio de js/state.js, testes correspondentes, reorganização da Home, ajuste de grade e teste da ordem visual/DOM, além dos registros deste relatório. A publicação não altera os pesos de risco e não integra o motor experimental ao Pix. O HTML alternativo legado, preexistente e não rastreado, permanece preservado fora da entrega da aplicação principal.

## Ajuste visual — Rota da Segurança compacta

Removidos os dois parágrafos introdutórios entre o título da Rota e os pilares. Reduzidos discretamente o preenchimento do cartão e dos botões e os ícones de 32 para 28 px; preservados textos dos pilares, cores, IDs, ações e posição acima do saldo. A altura mínima global de 44 px dos botões continua aplicada. Apenas index.html e este relatório foram alterados; lógica financeira preservada.

Executado tests/layout.cjs com JUSTEC_RESOURCE_BRIDGE=1 e JUSTEC_TEST_URL=http://127.0.0.1:8770/: aprovado nas sete larguras 320/375/390/768/1024/1366/1920, dez telas e dois modais por largura, sem erros JavaScript. Publicação segue a autorização do usuário para atualizar GitHub e site. A verificação local não equivale a inspeção do site em produção.

## Ajuste visual — Remoção do aviso acima da Home

Removido, a pedido do usuário, o quadro “Ambiente de demonstração — operações fictícias” de index.html e suas duas regras CSS sem uso em css/style.css. Nenhuma lógica de negócio foi alterada. Histórico deste relatório preservado.

Executado tests/layout.cjs com JUSTEC_RESOURCE_BRIDGE=1 e servidor local na porta 8770: aprovado nas sete larguras 320/375/390/768/1024/1366/1920, dez telas e dois modais por largura, sem erros JavaScript. Publicação segue a autorização vigente para atualizar GitHub e site; teste de navegador realizado localmente.

## Experimento visual — Título antes da transferência

Substituído “ROTA DA SEGURANÇA JUSTEC” por “Antes de transferir, confira.” em index.html. O texto agora é um título semântico h2, branco, de 16 px e em negrito, preservando o ícone, o cartão e as ações dos pilares. Nenhuma regra de negócio foi modificada. Ponto de referência anterior ao experimento: commit a3a824a; é possível restaurar apenas o título sem desfazer alterações posteriores.

Executado tests/layout.cjs com JUSTEC_RESOURCE_BRIDGE=1 e servidor local na porta 8770: aprovado nas sete larguras 320/375/390/768/1024/1366/1920, dez telas e dois modais por largura, sem erros JavaScript. Publicação para avaliação visual segue a autorização vigente do usuário.

## 21/10/2026 — Cartão de segurança inspirado na referência visual

Reorganizado apenas o cartão home-security em index.html e css/style.css: fundo azul discreto, borda suave, título branco, ícone amarelo e subtítulo da referência “Um minuto de atenção pode fazer diferença.”. Os dois pilares foram apresentados como botões compactos lado a lado (“Tenho dúvida” e “Sofri um golpe”), com os nomes completos preservados em aria-label e as ações navigateTo originais. No tablet/desktop, cabeçalho e ações ficam na mesma linha; no mobile, ações abaixo do cabeçalho. Botões mantêm altura mínima de 44 px e foco visível. Saldo, serviços e lógica financeira não foram alterados.

Executados tests/layout.cjs (sete larguras, dez telas e dois modais por largura) e tests/shortcuts.cjs (49 verificações), todos aprovados, sem erros JavaScript, com JUSTEC_RESOURCE_BRIDGE=1 e servidor local na porta 8770. Inspecionada também captura da Home em 390 px. Publicação segue a autorização vigente. O experimento anterior está no commit c644d3e; o visual anterior à troca do título está em a3a824a. Ambos permanecem disponíveis para reversão seletiva.

## 20/10/2026 — Reformulação local: Orientação e Defesa do Consumidor

### Diagnóstico, escopo e preservação

Inspecionados index.html, css/style.css, js/app.js e os testes existentes antes da edição. A antiga tela “Como funciona a proteção do Pix”, #screen-action-post, priorizava quatro explicações técnicas do simulador e possuía orientação MED e roteiro para falar com o banco. O documento enviado pelo usuário pede uma central prática, preservando o simulador. Seu comando final, “Não fazer commit, push ou deploy automaticamente”, prevalece sobre a autorização de publicação das etapas anteriores: esta entrega permanece local para revisão.

Os dois relatórios foram comparados por conteúdo e histórico: o da raiz registra implementação, correções, testes e publicações; Documentação/RELATORIO_MESTRE_JUSTEC.md conserva registros iniciais de desenvolvimento e arquitetura. Este registro foi acrescentado somente ao principal na raiz, sem apagar ou reescrever o histórico de nenhum deles.

### Conteúdo e decisões de implementação

Mantido o ID #screen-action-post e todos os vínculos de navegação existentes. O novo título é “Orientação e Defesa do Consumidor”, com o subtítulo solicitado. Quatro cartões abordam suspeita de golpe, Pix já enviado, ocorrência/provas e problema não resolvido pelo banco. A triagem existente é aberta pelo mesmo navigateTo('screening'). A orientação pós-golpe existente é acessada por âncora para #med-emergency-guide, com o roteiro original openMedWizard(), sem recursão de navegação ou novo fluxo bancário.

Seis cartões distinguem instituição financeira (aplicativo/SAC/ouvidoria), Procon, Banco Central, Consumidor.gov.br, Polícia Civil e Defensoria Pública. Cada um apresenta função, momento de procurar, contato, ação útil e informações complementares em details/summary. O cartão do próprio banco abre a orientação de preparação do contato, sem inventar uma URL de banco do usuário. Não há formulários nem coleta de dados pessoais. Não são prometidos ressarcimento, condenação ou resultado; MED, boletim de ocorrência, reclamação administrativa e assistência jurídica são diferenciados. O 151 é mencionado apenas como possibilidade local a confirmar; não foi criado nenhum link tel:, pois a verificação atual não foi possível.

As quatro explicações técnicas foram realocadas integralmente para o details #guard-about, “Sobre o JUSTEC Guard”, fechado inicialmente. Preservados #guard-operation-guide, seus quatro artigos e ações para proteção, histórico e revisão; também preservados o conteúdo de #med-emergency-guide e seu botão de roteiro. Uma comparação programática com git show HEAD:index.html confirmou que os dois trechos originais continuam literalmente presentes. Não foram alterados arquivos JavaScript de saldo, estado, extrato, Pix, bloqueios/revisões ou risco; nenhum motor experimental foi integrado.

Estilos da nova central estão restritos a suas classes em css/style.css: azul-escuro, amarelo nas ações, rosa/vermelho apenas na situação urgente, cartões com uma coluna no mobile e duas a partir de 768 px, largura de leitura e navegação responsiva preexistentes. Ações com pelo menos 44 px, títulos associados aos artigos por aria-labelledby, foco visível e expansões nativas operáveis por teclado. Links externos identificam nova aba e usam noopener noreferrer. Nenhuma dependência adicionada.

### Fontes oficiais e limitação de verificação

Foram tentadas consultas HTTPS aos seguintes endereços; TODOS retornaram “Tunnel connection failed: 403 Forbidden”. Nenhum conteúdo dessas páginas foi obtido e nenhuma informação nova foi tratada como revalidada nesta sessão:

- https://www.bcb.gov.br/meubc/registrar_reclamacao
- https://www.bcb.gov.br/estabilidadefinanceira/pix
- https://www.consumidor.gov.br/pages/conteudo/publico/1
- https://www.procon.sp.gov.br/
- https://www.defensoria.sp.def.br/
- https://www.delegaciaeletronica.policiacivil.sp.gov.br/ssp-de-cidadao/home
- https://www.gov.br/mj/pt-br/assuntos/seus-direitos/consumidor/defesadoconsumidor
- https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm

A interface informa expressamente “Validação pendente”. Os portais BCB, Consumidor.gov.br e Defensoria/SP indicados na solicitação são mantidos; Procon/SP e Delegacia Eletrônica/SP são referências estaduais propostas, sujeitas a confirmação. Exemplos de São Paulo são identificados e não apresentados como atendimento nacional. Antes de publicar, conferir disponibilidade de cada URL, conteúdo oficial atual, competências, requisitos e atendimento local/151 em rede com acesso. A página evita prazos, telefones bancários e outros detalhes não confirmados.

### Arquivos modificados

- index.html: central prática, cartões institucionais e realocação do guia técnico.
- css/style.css: estilos locais da central e grade responsiva.
- tests/guard-content.cjs: abre a seção técnica quando fechada antes das mesmas verificações de regressão.
- tests/consumer-guidance.cjs (novo): navegação, cartões, expansões por teclado, âncoras, links externos, estado e coordenadas dos controles.
- RELATORIO_MESTRE_JUSTEC.md: registro incremental desta entrega.

### Testes executados e resultados

Servidor anterior na porta 8770 não respondeu (ERR_EMPTY_RESPONSE). Iniciado servidor Python na porta 8780. O primeiro ensaio da suíte nova usou um ID de menu inexistente e encerrou por timeout; corrigido o seletor para o data-nav-screen já existente, sem mudar a aplicação para atender ao teste.

Executados em Chromium com JUSTEC_RESOURCE_BRIDGE=1 e JUSTEC_TEST_URL=http://127.0.0.1:8780/:

- tests/balance.cjs: aprovado, saldo/visibilidade, navegação, diagnósticos, modais e reinicialização.
- tests/statement.cjs: aprovado, totais/filtros, detalhes, cópia e falha, contestação educativa e estado vazio.
- tests/pix.cjs: aprovado, cenários baixo/moderado/elevado, validações, débito único, interrupção, restrições e revisões, falso positivo, mascaramento, cancelamento e reinício.
- tests/shortcuts.cjs: aprovado, 49 verificações de atalhos mobile/desktop.
- tests/guard-content.cjs: aprovado em 390/1366, preservando as verificações técnicas, MED e uma interrupção real do simulador sem débito/lançamento/comprovante.
- tests/layout.cjs: aprovado nas sete larguras 320/375/390/768/1024/1366/1920, dez telas e dois modais por largura, sem rolagem horizontal ou concorrente e sem erros JavaScript.
- tests/consumer-guidance.cjs: aprovado na execução inicial completa nas sete larguras; verifica seis instituições, títulos acessíveis, navegação, ausência de coleta de dados, detalhes pelo teclado, âncoras e 35 aberturas externas com destinos interceptados por teste. Verificação ampliada das coordenadas de cada controle registrada abaixo após sua execução.

Executado node --test tests/state-invariants.cjs tests/guard.test.mjs: 97 testes aprovados, zero falhas ou testes ignorados. Inspecionada captura integral da nova página em 390 px. git diff --check sem erros. Não houve alteração da lógica transacional para conseguir aprovação.

Abertura de links externos foi testada com interceptação local, NÃO acesso real aos serviços. Não equivale a verificar disponibilidade remota, autenticação ou envio de reclamação. Acessibilidade verificada por semântica, foco, teclado e coordenadas; não houve auditoria completa com leitor de tela nem teste em aparelhos físicos/Safari/Firefox. Não houve publicação nem teste em produção.

### Validação local e pendências

No VS Code, abrir index.html pelo Live Server e acessar “Pós-Golpe” no mobile ou “Pós-golpe e MED” no desktop. Conferir quatro situações, links para triagem e roteiro, seis instituições, expansões com Enter e o guia técnico ao final. Confirmar navegação de retorno e ausência de sobreposição com cabeçalho/rodapé. Para executar as suítes automatizadas, iniciar python -m http.server 8780 e configurar JUSTEC_TEST_URL=http://127.0.0.1:8780/; o adaptador de recursos só é necessário quando o navegador não alcança as CDNs. A suíte unitária de estado/Guard dispensa servidor.

Pendências antes de publicação: validar oficialmente fontes e URLs, confirmar adequação regional dos canais e revisar o texto jurídico-informativo. Implementação pronta para revisão local, com essas limitações explícitas; nenhum commit, push ou deploy realizado nesta etapa. O HTML legado não rastreado permanece intacto e fora da aplicação principal.

Resultado da ampliação final de tests/consumer-guidance.cjs: aprovado nas sete larguras. Cada botão, link e summary visível foi rolado à área útil e verificado por coordenadas e elementFromPoint, sem cobertura pelo cabeçalho/navegação e sem transbordamento horizontal. Mantidos os 35 testes de abertura externa interceptada e a comparação de bankState antes/depois, sem alterações. A segunda execução completa não introduziu falhas.

## 20/10/2026 — Publicação autorizada da Central de Orientação

Após a revisão local, o usuário autorizou explicitamente atualizar o GitHub e publicar o site, substituindo a restrição de publicação da solicitação anterior. A entrega inclui a reformulação de #screen-action-post, estilos locais, preservação do guia técnico e MED, os testes de conteúdo e a nova suíte tests/consumer-guidance.cjs, além deste relatório. Os resultados dos testes executados estão registrados na seção anterior. Conferidos git diff --check e alinhamento do HEAD com main remoto antes do envio. O HTML alternativo legado permanece preservado fora da entrega.

A publicação mantém o aviso de validação pendente dos portais oficiais: o bloqueio HTTP 403 impediu verificar disponibilidade e conteúdo remoto, e os testes de abertura usaram interceptação. A autorização de publicação não transforma esses testes em verificação real dos serviços. Nenhuma lógica de negócio foi modificada nesta reformulação.
