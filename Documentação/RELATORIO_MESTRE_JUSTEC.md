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
