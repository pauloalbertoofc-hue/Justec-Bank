# JUSTEC Bank — Relatório-Mestre de Desenvolvimento

## Registro 001 — 17/10/2026

### Objetivo
Reproduzir, executar e desenvolver manualmente no Visual Studio Code o protótipo JUSTEC Bank, com visualização local ao vivo, explicação de cada etapa e histórico de decisões e testes.

### Material de referência
Arquivo recebido: `Protótipo JUSTEC - Banco Digital & Anti-Golpe.html` (834 linhas, conforme leitura inicial).

### Tecnologias identificadas
- HTML5 para estrutura.
- Tailwind CSS via CDN para classes utilitárias e tema.
- CSS embutido para efeitos visuais e animações.
- JavaScript puro para navegação e simulações.
- Font Awesome via CDN para ícones.
- Google Fonts (Plus Jakarta Sans) via serviço externo.

### Estrutura funcional observada
1. Home bancária.
2. Pix demonstrativo, com cenários seguro e suspeito.
3. Triagem preventiva de golpes.
4. Guia pós-golpe e roteiro MED.
5. Direitos do consumidor.
6. Centro educacional.
7. Modal dinâmico para alertas e fluxos.

### Limitações e observações
- Não há backend ou integração bancária real.
- O leitor biométrico é uma simulação de clique, não autenticação de impressão digital.
- As análises de risco são cenários fixos, não consultas reais a registros oficiais.
- A função `toggleBalance()` troca o ícone do olho, mas não oculta o valor do saldo; isso será corrigido em etapa posterior.
- A redação de algumas afirmações jurídicas e de segurança precisa ser revisada antes de publicação pública.
- O carregamento de estilos, fontes e ícones por CDN exige internet.

### Plano incremental
**Etapa 1:** abrir o HTML original no VS Code e habilitar Live Server para visualização e atualização local.
**Etapa 2:** testar navegação e funcionalidades existentes, registrar resultados.
**Etapa 3:** separar HTML, CSS e JavaScript em arquivos organizados sem alterar o comportamento.
**Etapa 4:** corrigir defeitos identificados, começando pela ocultação do saldo e acessibilidade.
**Etapa 5:** revisar textos jurídicos, avisos e segurança das simulações.
**Etapa 6:** evoluir arquitetura e funcionalidades conforme requisitos validados.

### Estado de execução
Arquivo analisado; configuração local ainda não executada nem verificada pelo usuário. Aguardando resultado da primeira abertura com Live Server.

## Registro 002 — Separação de responsabilidades (instruções, pendente de confirmação)

**Estado informado:** o usuário confirmou que o protótipo original abriu no Live Server.

**Objetivo:** extrair o CSS embutido do bloco `<style>` do `<head>` para `css/style.css` e o JavaScript de aplicação do último bloco `<script>` para `js/app.js`, preservando o HTML e a configuração Tailwind presente no primeiro `<script>`.

**Procedimento orientado:** criar as pastas `css` e `js`; mover apenas o conteúdo interno dos respectivos blocos; substituir o bloco de estilo por `<link rel="stylesheet" href="./css/style.css">`; substituir o último bloco de script por `<script src="./js/app.js"></script>` antes do fechamento do `body`; salvar e testar navegação, Pix e diagnósticos.

**Conceitos:** HTML organiza a estrutura; CSS define a apresentação; JavaScript controla o comportamento; caminhos `./` são relativos ao arquivo HTML; scripts ao fim do corpo executam após o navegador interpretar a marcação anterior.

**Cuidados e limitações do protótipo:** o botão de ocultar saldo apenas troca o ícone, sem ocultar o número; a biometria é simulada por clique; as informações de risco Pix são fictícias e não representam consultas ao Banco Central. Não utilizar como banco real ou como sistema de proteção efetiva contra fraudes.

**Estado de validação:** a separação ainda não foi confirmada pelo usuário. Não registrar os testes como concluídos antes da confirmação.

**Próximo passo:** verificar se o layout permanece idêntico e se os botões continuam respondendo; depois corrigir funcionalidades simuladas com comunicação clara de seus limites.

## Registro 003 — Etapa 2 validada e Etapa 3 orientada (17/10/2026)

### Evidência e estado
O usuário confirmou ter separado HTML, CSS e JavaScript e executado com sucesso os cinco testes: layout inicial, fluxo Pix, diagnósticos, navegação inferior e modal biométrico. Portanto, a Etapa 2 está concluída por relato do usuário; os arquivos locais modificados não foram enviados para inspeção independente.

### Objetivo da Etapa 3
Corrigir a ocultação do saldo e introduzir o conceito de estado da aplicação, preservando o comportamento restante.

### Procedimento manual proposto (ainda não confirmado)
1. Em `index.html`, adicionar `id="balance-display"` e `aria-label="Saldo disponível"` ao elemento `h2` que apresenta `R$ 2.480,50`.
2. Em `js/app.js`, substituir `let isBalanceVisible = true;` por `const bankState = { balance: 2480.50, isBalanceVisible: true };`, mantendo `currentPixType`.
3. Substituir a função original `toggleBalance()` por duas funções: `renderBalance()` e `toggleBalance()`; chamar `renderBalance()` ao final do arquivo.
4. Testar a alternância do botão, o formato BRL e a preservação da navegação.

### Explicações técnicas
- `bankState` guarda o valor do saldo e um booleano de visibilidade; não representa conta bancária real.
- `document.getElementById` encontra elementos pelos IDs HTML; a checagem de existência evita exceção quando não encontrados.
- `textContent` define texto sem interpretar HTML; `toLocaleString('pt-BR', {style:'currency', currency:'BRL'})` apresenta valor no padrão monetário brasileiro.
- O operador `!` inverte um booleano. O código deve rodar após os elementos HTML estarem disponíveis, o que ocorre com o script ao final de `body`.

### Testes pendentes
Saldo visível inicialmente; um clique oculta; outro clique restaura; formatação R$ 2.480,50; demais telas e modais sem regressões. Aguardar confirmação do usuário antes de registrar a etapa como concluída.

### Observações de segurança
A ocultação visual do saldo não é proteção de dados nem controle de acesso. Os valores e transações do protótipo continuam demonstrativos. Não apresentar biometria, avaliação de risco e transferência como processos reais.


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
