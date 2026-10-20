# JUSTEC Bank e JUSTEC Guard — Diagnóstico e plano de evolução

**Documento preparado para ser anexado a uma nova conversa com o ChatGPT.**

Data: 20/10/2026, referência de horário America/Sao_Paulo. Projeto: pauloalbertoofc-hue/Justec-Bank. Site: https://justec-bank.vercel.app. Versão funcional examinada: alterações responsivas publicadas no commit `07dcecd`, sobre a base `3ddf0b3`. O GitHub confirmou o envio à main e a integração Vercel informou **Deployment has completed** para `07dcecd`. Esse status não substitui teste funcional direto do domínio público.

## 1. Resumo para decisão

O JUSTEC já funciona como demonstração navegável de banco digital, com saldo fictício, extrato, Pix simulado, classificação de risco, interrupções, restrições internas, revisão de falso positivo e conteúdo educativo. A aplicação tem layout mobile/tablet/desktop e testes automatizados úteis.

A validação desta revisão não encontrou falha nos fluxos normais cobertos pelas sete suítes. Entretanto, verificações exploratórias reproduziram limitações fora dessa cobertura: validação insuficiente no lançamento de domínio, supressão excessiva de indicadores após uma revisão e acessibilidade incompleta do modal de diagnóstico. Não é correto descrever o sistema como totalmente validado, antifraude comprovado ou apto a operar dinheiro real.

**Próxima evolução recomendada:** primeiro fortalecer invariantes financeiras e o tratamento de evidências/revisões; depois planejar a integração controlada do motor versionado ao simulador, com auditoria; em paralelo, corrigir acessibilidade e tornar a suíte reproduzível fora do ambiente atual. Não começar por adicionar um backend bancário ou por apenas criar mais telas.

### O que foi feito agora

1. Reexecutadas as sete suítes de testes existentes.
2. Publicadas as alterações responsivas que já estavam locais: retirada de CSS inline duplicado, serviços em duas colunas abaixo de 375px, margens de rolagem e matriz de sete larguras/dez telas.
3. Inspecionados os módulos de estado, riscos, Pix, auditoria e interface; realizadas sondagens isoladas adicionais sem alterar as regras de negócio.
4. Tentada consulta a fontes jurídicas e técnicas oficiais. O acesso foi bloqueado pela rede, conforme seção de referências.
5. Preparados este diagnóstico, backlog priorizado, cenários de pesquisa e um prompt de continuidade para o ChatGPT.

### O que não foi implementado nesta revisão

As recomendações deste documento **não** foram automaticamente aplicadas. Não houve integração do motor experimental ao Pix, backend, persistência, autenticação real, alteração de pesos ou conexão financeira. As sondagens de defeitos de domínio foram executadas em contextos descartáveis, sem corromper os dados da aplicação publicada.

## 2. Escopo, método e grau de evidência

- **Executado:** comando ou interação realmente realizados nesta sessão, com resultado observado.
- **Inspecionado:** conclusão diretamente sustentada pelo código, mas sem testar todas as combinações possíveis.
- **Proposto:** melhoria futura, ainda não implementada ou validada.
- **Referência a confirmar:** base doutrinária, normativa ou jurisprudencial indicada para pesquisa; não consultada integralmente online nesta revisão.

Testes de interface: Chromium headless, servidor HTTP estático local em 127.0.0.1:8765. O adaptador opcional `JUSTEC_RESOURCE_BRIDGE=1` fornece ao navegador os mesmos recursos oficiais por HTTPS via curl, com verificação TLS. Não muda a aplicação nem substitui a necessidade de testar as CDNs na implantação real.

O acesso direto ao domínio público foi bloqueado em verificações anteriores deste ambiente; a publicação é comprovada pelo status Vercel associado ao commit, e não por navegação funcional do site em produção. Não foram executados testes em dispositivo físico, Safari/Firefox, leitor de tela, pentest, carga, auditoria jurídica ou avaliação estatística do modelo.

## 3. Arquitetura que o próximo ChatGPT precisa conhecer

| Componente | Situação atual | Cuidado na evolução |
| --- | --- | --- |
| index.html / css/style.css | Aplicação estática responsiva, tema azul/amarelo, menu lateral desktop e inferior mobile | Preservar IDs, vínculos e conteúdo já corrigido; não reintroduzir moldura de celular |
| js/transactions.js | Doze movimentações iniciais e data fixa de cenário em 17/10/2026 | Não confundir data de demonstração com relógio real |
| js/state.js | Saldo derivado em centavos; coleções de transações, tentativas e restrições em memória | Fortalecer validação de domínio antes de qualquer integração |
| js/risk.js | Motor efetivamente usado pelo Pix, da Etapa 5; depende de estado | Não é o mesmo motor versionado da Etapa 6 |
| js/app.js | Navegação, saldo, extrato, modais e conteúdo educativo | Não duplicar lógica de navegação para desktop/mobile |
| js/pix.js | Fluxo em etapas, confirmações, operações e revisões simuladas | Preservar deduplicação, invalidação de conferências e identidade local da chave |
| js/guard/risk-engine.js | Motor puro isolado, indicadores R01–R06 e versão 0.2.0 | Não presumir que já protege as operações exibidas no site |
| js/guard/policy-engine.js | decideAction independente da interface | Não transformar a ação recomendada em bloqueio real de chave/conta |
| js/guard/audit.js | Snapshots lógicos imutáveis e revisões separadas | Não equivale a armazenamento inviolável, persistente ou autenticado |
| tests/ | Suítes Node/Playwright e helper de recursos | Dependências de teste e ambiente ainda precisam ser padronizados |

O saldo inicial demonstrativo é R$ 2.480,50. Operações aprovadas alteram o extrato e o saldo uma única vez; interrupções ficam em histórico separado. A recarga da página reinicia o cenário. Isso é uma escolha atual de demonstração, não perda de dados causada pela responsividade.

Há dois relatórios mestres. O da raiz é o histórico principal desta implementação; o de Documentação/ preserva os registros locais iniciais e registros posteriores. Não devem ser sobrescritos ou tratados como cópias idênticas.

## 4. Funcionalidades verificadas nesta revisão

| Suíte executada | Resultado observado |
| --- | --- |
| tests/layout.cjs | Passou nas larguras 320, 375, 390, 768, 1024, 1366 e 1920px, em dez telas: 70 combinações de tela/largura e 14 verificações de modais; sem erro JavaScript |
| tests/balance.cjs | Saldo, ocultar/revelar, ícones, nomes acessíveis, navegação, triagem, MED e reinício passaram |
| tests/statement.cjs | Filtros, totais, detalhes, clipboard real e falha controlada, fechar/Escape do diálogo nativo, orientações e estado vazio passaram |
| tests/pix.cjs | Risco baixo/moderado/elevado, confirmações, valores inválidos, limite/saldo, débito único, tentativas sem débito, revisões, chave repetida e cancelamento assíncrono passaram |
| tests/shortcuts.cjs | 49 verificações passaram: serviços, cabeçalho, Central, menus, extrato, Direitos e MED |
| tests/guard-content.cjs | Conteúdo do bloqueio de operação/restrição interna, distinção de conta/DICT, MED separado e coerência com uma interrupção do simulador passaram |
| tests/guard.test.mjs | 39 testes passaram, zero falhas/ignorados: motor isolado, política, cenários, pesos, deduplicação, entradas inválidas, imutabilidade e revisão/auditoria |

Não somar esses números como se fossem uma única contagem homogênea de testes: há unidades, verificações de navegação e matrizes de viewport. Aprovação das suítes é evidência dos cenários cobertos, não prova universal de correção.

### Comandos reproduzidos

```sh
python -m http.server 8765 --bind 127.0.0.1 --directory /caminho/Justec-Bank
```

Em outro terminal, na raiz do projeto, com Playwright/Chromium já disponíveis:

```sh
JUSTEC_RESOURCE_BRIDGE=1 JUSTEC_TEST_URL=http://127.0.0.1:8765/ node tests/layout.cjs
JUSTEC_RESOURCE_BRIDGE=1 JUSTEC_TEST_URL=http://127.0.0.1:8765/ node tests/balance.cjs
JUSTEC_RESOURCE_BRIDGE=1 JUSTEC_TEST_URL=http://127.0.0.1:8765/ node tests/statement.cjs
JUSTEC_RESOURCE_BRIDGE=1 JUSTEC_TEST_URL=http://127.0.0.1:8765/ node tests/pix.cjs
JUSTEC_RESOURCE_BRIDGE=1 JUSTEC_TEST_URL=http://127.0.0.1:8765/ node tests/shortcuts.cjs
JUSTEC_RESOURCE_BRIDGE=1 JUSTEC_TEST_URL=http://127.0.0.1:8765/ node tests/guard-content.cjs
node --test tests/guard.test.mjs
```

O prefixo de variáveis acima usa sintaxe de shell Unix. No PowerShell, definir `$env:JUSTEC_TEST_URL` e `$env:JUSTEC_RESOURCE_BRIDGE` antes de executar Node. Parte da suíte assume `/usr/bin/chromium`; padronizar `CHROMIUM_PATH` é uma melhoria pendente. O helper de CDNs é específico do ambiente de teste e usa curl; em redes onde o navegador alcança as CDNs, pode ser dispensado.

## 5. Achados concretos e prioridades

### P0 — Não aceitar valores inválidos na camada de estado

**Executado, defeito de domínio:** a chamada direta a `recordApprovedPix()` com `amount: NaN`, em uma VM descartável, foi aceita: as transações passaram de 12 para 13 e `bankState.balance` tornou-se NaN. A interface normal rejeita esse valor antes, e sua suíte passou; portanto não se trata de demonstração de transferência bancária real ou de falha no formulário comum.

**Causa:** a função confere apenas `amount <= 0` e `amount > balance`; comparações com NaN retornam falso. Também falta contrato explícito de tipo, precisão, ID e participante nessa fronteira.

**Recomendação:** validar números finitos, centavos inteiros/precisão, faixa e saldo; rejeitar formatos ambíguos e valores programáticos inadequados; preservar idempotência. Preferir `amountCents` inteiro no domínio. Não depender somente do formulário.

**Aceitação:** NaN, Infinity, strings, mais de duas casas, montantes não positivos e objetos incompletos não alteram transações, saldo ou IDs; chamadas duplicadas não debitam duas vezes; casos válidos continuam funcionando. Definir explicitamente se o limite demonstrativo pertence também a essa camada.

### P0 — Revisão deve remover evidências específicas, não criar liberação permanente

**Executado, limite confirmado da evolução atual:** após marcar a restrição do cenário D como retirada, foram introduzidos novos flags fictícios de alerta, chave recente e mudança de comportamento. `evaluateRisk()` retornou score 0/low, porque qualquer revisão retirada faz o motor ignorar todos os flags desse destinatário. Esse comportamento faz sentido apenas como atalho do cenário de falso positivo original, não como regra para novas evidências.

**Recomendação:** atribuir ID, data e versão às evidências; vincular revisão à avaliação/restrição específica; registrar quais sinais foram afastados e reavaliar sinais posteriores. Não apagar a decisão original nem reutilizar automaticamente uma revisão antiga para fatos novos.

**Aceitação:** o falso positivo conhecido é liberado no cenário original; uma evidência posterior válida para outro cenário volta a ser considerada; restrição ativa continua impedindo envio; a auditoria mostra as duas avaliações e a revisão entre elas.

### P1 — Integrar o motor versionado por um serviço explícito, somente em tarefa própria

**Inspecionado:** a UI usa `js/risk.js`, enquanto a Etapa 6 usa R01–R06, pesos diferentes e `decideAction()`. Essa separação foi deliberada e não deve ser chamada de regressão. Contudo, impede afirmar que os testes do motor isolado validam a política aplicada pelo Pix atual.

**Recomendação:** criar um contrato de serviço que receba snapshot da operação, derive indicadores do cenário, execute motor/política e devolva avaliação versionada. Migrar com testes de equivalência e diferenças intencionais; não carregar dois motores globais concorrentes nem apenas trocar nomes de funções.

**Aceitação:** uma fonte de regras por operação; versões e motivos no resultado; todos os casos de aprovação, confirmação, interrupção e revisão cobertos de ponta a ponta; nenhuma integração financeira real.

### P1 — Tornar claro se o risco é do destinatário ou da operação

**Executado:** o cenário B tem 35/moderado quando avaliado com R$ 50,00, mas 60/elevado para R$ 1.500,00. A listagem de Proteção usa valor fixo 50; o Pix usa o valor informado. A diferença é esperada matematicamente, mas o rótulo genérico pode parecer incoerente.

**Recomendação:** separar reputação/indicadores fictícios do destinatário de risco contextual da operação; mostrar o valor de referência ou avisar que o risco será recalculado para a transferência. Exibir os fatores e pesos relevantes sem chamar destinatário de fraudador.

**Aceitação:** a UI explica a mudança de classificação entre dois valores; os motivos do resultado correspondem ao snapshot da operação, não a uma recomputação posterior genérica.

### P1 — Corrigir o modal de diagnóstico para teclado e leitor de tela

**Executado:** `#app-modal` não tem role, aria-modal ou aria-labelledby. Após abrir um diagnóstico e pressionar Escape, ele continuou visível. Já o comprovante usa dialog nativo e fecha com Escape nos testes.

**Recomendação:** convergir para dialog nativo ou implementar o padrão acessível completo: nome, foco inicial, contenção e retorno de foco, Escape e área de rolagem. Não confundir `role=status` com um diálogo modal.

**Aceitação:** abrir e fechar só por teclado, não alcançar a página ao fundo enquanto modal aberto, voltar o foco ao acionador, título anunciado e ações visíveis em viewport pequena. Validar com tecnologia assistiva, não apenas por presença de atributos.

### P1 — Auditoria do fluxo real da demonstração, separada de revisão financeira

**Inspecionado:** os registros versionados imutáveis de `js/guard/audit.js` são isolados; o fluxo Pix mantém histórico simplificado em memória. A interface de “Contestações” é principalmente revisão de restrição; “Não reconheço” do extrato abre orientação, não processo bancário.

**Recomendação:** distinguir três jornadas: revisar restrição interna, relatar movimentação não reconhecida no cenário e consultar orientação MED. Registrar IDs de operação/avaliação/revisão, versões, motivos, sequência temporal e desfecho, sem alterar o original. Oferecer exportação JSON fictícia e botão explícito de reiniciar demonstração antes de pensar em banco de dados.

**Aceitação:** nenhuma contestação aparenta ter sido enviada a um banco; retirada interna não promete restituição; revisões aparecem ligadas à avaliação correta; exportação mantém etiquetas de simulação.

### P1 — Padronizar testes, dependências de desenvolvimento e CI

**Inspecionado:** os testes de navegador dependem de Playwright/Chromium já disponíveis no ambiente. Não há configuração de CI versionada no repositório inspecionado. Os scripts não são todos portáveis entre Windows e Linux.

**Recomendação:** manifesto de desenvolvimento com versões/lockfile, scripts documentados, instalação reprodutível de navegador, testes em CI e exportação de resultados por commit. Isso não exige framework de interface nem dependências em produção.

**Aceitação:** um clone limpo executa os testes seguindo o README; caminhos/portas são configuráveis; o pipeline bloqueia falhas reais e não ignora seletivamente asserções.

### P2 — Robustez visual e dependências externas

**Inspecionado:** Tailwind em runtime, ícones e fontes dependem de CDNs; atributos onclick e configuração inline complicam uma CSP estrita.

**Recomendação:** avaliar build de CSS ou ativos locais versionados, preservando o visual; migrar eventos de forma incremental quando necessário; definir cabeçalhos de segurança compatíveis. Não afirmar que a produção está sem cabeçalhos: eles não foram verificados no domínio público.

**Aceitação:** ausência de estilos externos não oculta os avisos essenciais; ativos não contêm segredos; política de conteúdo é testada e não quebra o Pix; não desativar TLS, checksums ou validações para resolver instalação.

### P2 — Privacidade por desenho e dados estritamente fictícios

**Inspecionado:** chaves digitadas são identificadas localmente por SHA-256 e máscara, e justificativas são texto livre em memória. Um hash não torna automaticamente um dado pessoal anônimo; pode haver inferência em domínios de baixa entropia. Não foi encontrada persistência automática em localStorage nesse fluxo.

**Recomendação:** preferir dados pré-definidos, exemplos em example.invalid e avisos junto aos campos; impedir uso de credenciais/documentos reais em apresentações; definir retenção e remoção antes de qualquer persistência. Não acrescentar analytics ou logs contendo chaves/motivos sem projeto de privacidade.

**Aceitação:** recarga/reinício limpa dados fictícios; exportação minimiza identificadores; nenhuma chamada externa recebe a chave digitada; documentar que o protótipo não oferece autenticação bancária.

### P2 — Pesquisa de usabilidade, conteúdo e acessibilidade

**Inspecionado/proposto:** rótulos “bloqueio”, “chave”, “conta”, “fraude”, “contestação” e “MED” são facilmente confundidos. A regressão de conteúdo anteriormente corrigida mostra que testes só de cliques não bastam.

**Recomendação:** revisão por tarefa e linguagem simples, conteúdo de referência por mecanismo, testes com usuários e cobertura semântica. Trabalhar contraste, zoom de 200%, ordem de foco, mensagens, telas curtas, orientação horizontal e leitores de tela, tomando WCAG 2.2 AA como alvo de trabalho, sem declarar conformidade antecipada.

**Aceitação:** usuário consegue explicar por que a operação foi interrompida, o que continua disponível e como pedir revisão; não confunde a mensagem com bloqueio oficial ou ressarcimento garantido.

### P2 — Explicabilidade e avaliação do modelo

**Proposto:** conjunto de cenários sintéticos versionados, com resultados esperados e razões, incluindo legítimos incomuns, fraude de baixo valor, repetição em janela temporal e novos fatos após revisão. Hoje não existe evidência de sensibilidade, especificidade ou precisão.

**Aceitação:** apresentar matriz de confusão e métricas somente após definir rótulos, conjunto de avaliação e protocolo; não chamar score de probabilidade; não treinar/validar com CPF ou dados bancários reais. Evitar “IA” como rótulo se o sistema continua sendo uma soma determinística de regras.

### P3 — Evolução arquitetural após os itens anteriores

Eventos/auditoria exportável, separação UI/domínio, histórico temporal e armazenamento demonstrativo podem ser úteis. Backend, perfis de acesso, criptografia, monitoramento e interoperabilidade exigem novo escopo. Uma aplicação cliente pode ser alterada pelo usuário no navegador; não constitui fronteira de autorização para dinheiro real. Nenhuma API financeira deve ser ligada ao protótipo apenas porque as telas estão funcionando.

## 6. Doutrina, normas e jurisprudência: como usar sem produzir falsas garantias

### Situação da pesquisa

Foram tentados acessos a Planalto (CDC/LGPD), Banco Central (Pix/MED), STJ (notícia sobre operações fora do perfil), W3C (WCAG 2.2) e OWASP (ASVS). Todos foram bloqueados pela rede nesta revisão. **Nenhuma dessas páginas foi lida com sucesso nesta sessão.** Os apontamentos abaixo são referências conceituais e indicações para conferência, não parecer jurídico nem pesquisa de jurisprudência atualizada em 20/10/2026.

Não foram atribuídas citações literais, páginas de livros, datas de julgamento específicas ou tese vinculante a uma fonte não lida. Antes de publicar afirmações normativas na interface, obter o texto oficial vigente, o inteiro teor do precedente e a revisão de profissional habilitado. Especial atenção às regras e procedimentos de Pix/DICT/MED que podem ter mudado após a edição dos documentos originais.

### Doutrina indicada para estudo

- **Sérgio Cavalieri Filho, Programa de Responsabilidade Civil:** estudar risco da atividade, defeito do serviço, nexo e excludentes. Aplicação no JUSTEC: construir cenários que expliquem a diferença entre indício, dano, prevenção e responsabilidade; não inferir automaticamente responsabilidade jurídica a partir de score.
- **Cláudia Lima Marques, Contratos no Código de Defesa do Consumidor:** estudar boa-fé, vulnerabilidade e dever de informação. Aplicação: avisos compreensíveis, consequência da decisão e caminho de esclarecimento/revisão, evitando linguagem que intimide ou rotule pessoas.
- **Bruno Miragem, Curso de Direito do Consumidor:** aprofundar segurança e adequação de serviços. Aplicação: testar resultados, limitações e previsibilidade, em vez de usar “seguro” como promessa absoluta.
- **Danilo Doneda, Da privacidade à proteção de dados pessoais:** estudar governança e proteção de dados. Aplicação: minimização de dados, finalidade dos campos e cautela com identificação/pseudonimização.

São sugestões bibliográficas, sem edição ou paginação conferida. O próximo pesquisador deve localizar a edição consultada e registrar apenas argumentos realmente encontrados nela.

### Normas e precedentes indicativos

| Referência a confirmar na fonte oficial | Relação com o produto | O que não concluir automaticamente |
| --- | --- | --- |
| CDC, especialmente dever de informação e disciplina de responsabilidade por defeito do serviço | Explicar decisões, limites e segurança do serviço | Que todo golpe implica indenização ou que um score define nexo/culpa |
| Súmula 297 do STJ | Referência sobre aplicação do CDC às instituições financeiras | Que o protótipo acadêmico é uma instituição financeira |
| Súmula 479 do STJ | Referência sobre fortuito interno relativo a fraudes/delitos no âmbito de operações bancárias | Responsabilidade automática em qualquer situação, sem analisar fatos, defeito, nexo e excludentes |
| REsp 2.052.228/DF, indicado para pesquisa sobre operações que destoam do perfil do cliente | Motiva modelagem contextual de valor, sequência e comportamento; há divulgação jurisprudencial conhecida sobre esse tema | Que o caso fixa os pesos do JUSTEC ou exige bloqueio universal de chaves |
| LGPD, especialmente princípios, direitos e revisão de decisões baseadas em tratamento automatizado | Minimização, transparência, explicação e revisão quando o caso se enquadrar na lei | Direito irrestrito a desbloqueio, obrigação universal de rever qualquer regra ou anonimização pelo simples uso de SHA-256 |
| Regulamento Pix, documentos DICT e regras vigentes do MED | Distinguir operação, destinatário, chave, conta, notificação e devolução | Que revisão interna do JUSTEC produz efeito em registros oficiais ou que o MED sempre devolve valores |

**Sobre o REsp indicado:** é uma referência para aprofundamento, não acórdão integralmente conferido nesta sessão. Confirmar número, órgão, fatos, decisão e eventuais distinções/atualizações antes de citá-lo em trabalho acadêmico ou converter sua síntese em requisito jurídico. Não reproduzir ementa inventada. Se a confirmação não for possível, manter somente a recomendação técnica de avaliar transações fora do padrão, sem atribuir conclusão a esse processo.

### Links para pesquisa pelo próximo ChatGPT/pesquisador

- CDC: https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm
- LGPD: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
- Portal oficial STJ, pesquisa de súmulas e jurisprudência: https://www.stj.jus.br/
- Banco Central, Pix: https://www.bcb.gov.br/estabilidadefinanceira/pix
- Banco Central, perguntas e respostas: https://www.bcb.gov.br/meubc/faqs
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- OWASP ASVS: https://owasp.org/www-project-application-security-verification-standard/

Links são destinos de pesquisa, não confirmação de leitura, disponibilidade atual ou conteúdo específico. Não há base nesta revisão para anunciar conformidade com LGPD, normas do Bacen, WCAG ou ASVS.

## 7. Casuística de golpes e tradução em cenários acadêmicos

As situações abaixo são tipologias conhecidas de incidentes reais, propostas como cenários sintéticos. Não são relatos de vítimas identificadas nem julgamentos pesquisados nesta sessão. Usar dados inteiramente inventados; não atribuir crime a pessoa real.

| Tipologia | Aprendizado para o JUSTEC | Teste demonstrativo proposto |
| --- | --- | --- |
| Falsa central bancária / engenharia social | A ação pode ser comandada pelo próprio cliente sob engano; ter confirmação não prova consentimento informado ou ausência de defeito | Destinatário novo, pressão/urgência em narrativa fictícia e sequência atípica; mostrar orientação sem coletar conversa real |
| Falso parente em aplicativo de mensagens | Foto/nome não autenticam identidade | Reforçar confirmação por canal conhecido e independentemente obtido; um alerta isolado não acusa o destinatário |
| Falso motoboy / uso indevido de cartões e credenciais | Autenticação e segurança transacional são problemas distintos | Cenário fora do Pix como contraste educativo, sem aplicar MED como se fosse remédio para toda operação |
| Golpe com várias transferências pequenas | Limite de valor isolado pode produzir falso negativo | Janela temporal fictícia de quantidade/velocidade; o primeiro valor baixo não libera permanentemente os seguintes |
| Operação legítima incomum | Novo dispositivo, novo favorecido e valor alto não provam fraude | Oferecer confirmação adicional e revisão com evidências; medir falsos positivos |
| Revisão legítima seguida de um incidente novo | Liberação anterior não é salvo-conduto | Novo sinal posterior deve gerar nova avaliação, preservando a revisão antiga como histórico |

Para converter essas tipologias em estudo de caso, procurar notícia oficial/inteiro teor e preencher: data, fonte, fatos comprovados, mecanismo observado, resposta institucional, limitações da comparação e requisito proposto. Não inserir nomes, números ou decisões sem confirmação.

## 8. Backlog recomendado com critérios de conclusão

| Ordem | Entrega | Critério verificável |
| --- | --- | --- |
| 1 | Validação de domínio em centavos | Nenhuma entrada inválida altera o estado; suíte de invariantes e idempotência passa |
| 2 | Revisão vinculada à evidência/avaliação | Sinais novos não são apagados por uma decisão antiga; auditoria preserva ambos |
| 3 | Modal acessível | Escape, foco, nome e contenção testados; sem regressão em MED e comprovantes |
| 4 | Contrato único para risco/política | Adaptador versionado definido e testado sem ativação prematura; aprovação explícita antes de trocar o motor da UI |
| 5 | Coerência dos rótulos de risco | Usuário distingue risco de destinatário e da operação com valor/contexto |
| 6 | Jornada de revisão e contestação | Não confunde restrição interna, movimentação não reconhecida e orientação MED |
| 7 | CI e dependências de desenvolvimento | Clone limpo reproduz testes com logs, versões e retorno de erro adequado |
| 8 | Conteúdo jurídico verificado | Fontes oficiais e bibliografia consultada registradas por data, sem promessas absolutas |
| 9 | Recursos/segurança de frontend | Estratégia de CDNs, CSP e headers testada; sem supor proteção de backend inexistente |
| 10 | Avaliação de usabilidade e do modelo | Protocolo, dados sintéticos, métricas e limitações publicados antes de qualquer alegação de eficácia |

P0 aqui significa prioridade para robustez da próxima evolução, não incidente financeiro real: o projeto é um simulador cliente e não movimenta dinheiro.

## 9. Regras de continuidade para evitar novas regressões

1. Inspecionar arquivos e histórico reais antes de seguir diagnósticos antigos.
2. Não substituir arquivos inteiros por exemplos genéricos nem reintroduzir moldura de celular.
3. Separar correção de layout, correção de domínio e integração de motor em mudanças revisáveis.
4. Para cada problema, preservar reprodução antes da correção e adicionar teste que falhe no comportamento antigo.
5. Testar conteúdo crítico, não apenas cliques: operação versus chave/conta, risco versus fraude, revisão versus devolução.
6. Não usar o código fictício de apresentação como autorização, autenticação ou classificação real de pessoas.
7. Não integrar o motor experimental ao Pix sem tarefa e aprovação próprias; publicar arquivos não significa integrá-los.
8. Preservar os dois relatórios mestres; registrar a finalidade e evitar cópia cega entre eles.
9. Confirmar o status do commit na Vercel e distinguir teste local de teste no domínio público.
10. Não declarar testes aprovados, fontes consultadas ou eficácia demonstrada sem evidência.

## 10. Prompt pronto para uma nova conversa com o ChatGPT

> Estou desenvolvendo o JUSTEC Bank, simulador acadêmico estático em HTML/CSS/JavaScript, publicado em https://justec-bank.vercel.app e versionado em pauloalbertoofc-hue/Justec-Bank. Este documento contém um diagnóstico baseado no código e em testes executados em 20/10/2026. Leia-o e peça os arquivos atuais antes de programar.
>
> Quero um plano incremental de evolução do JUSTEC Guard, sem integrações financeiras reais. Priorize: validação de domínio contra NaN e precisão monetária; revisões ligadas a evidências específicas; acessibilidade do modal; contrato para integrar futuramente o motor puro R01–R06, sem ativá-lo sem minha autorização; auditoria explicável e jornadas que distingam restrição interna, contestação de movimentação e MED.
>
> Analise criticamente o backlog, separe defeitos confirmados de hipóteses e escolha uma primeira entrega pequena com critérios de aceitação e testes. Não reescreva a aplicação, não mude pesos ou regras sem justificar, não elimine funcionalidades e preserve os relatórios. Não prometa proteção real, recuperação de valores ou bloqueio no DICT. A aplicação não deve solicitar dados bancários ou credenciais reais.
>
> As referências jurídicas deste documento não foram conferidas online por bloqueio da rede. Se tiver acesso à web, confirme CDC/LGPD, Súmulas 297/479 do STJ, o REsp 2.052.228/DF indicado para pesquisa e normas vigentes de Pix/DICT/MED em fontes oficiais. Não invente ementas, citações doutrinárias, páginas ou regras atuais. Explique quais conceitos realmente fundamentam requisitos de software e quais conclusões dependem de análise jurídica e empírica.
>
> Antes de cada alteração, apresente o problema concreto e como o teste o reproduz. Depois, implemente apenas o escopo autorizado, execute os testes adequados e registre resultados e limitações. Ao final, indique os arquivos alterados, o que continua pendente e se houve ou não publicação.

## 11. Estado final desta entrega

- Alterações responsivas já existentes foram testadas e publicadas no commit funcional 07dcecd; deploy informado como concluído pela Vercel.
- O presente documento registra recomendações e defeitos a tratar, não implementações prometidas.
- Os fluxos normais testados passaram; as limitações exploratórias descritas continuam pendentes.
- A avaliação técnica foi local. Não houve verificação jurídica online bem-sucedida nem validação funcional direta do domínio público neste ambiente.
- Este documento é autocontido: pode ser enviado ao ChatGPT juntamente com os arquivos atuais do projeto e os testes.
