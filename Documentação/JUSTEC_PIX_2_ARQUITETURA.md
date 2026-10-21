# JUSTEC Bank — Pix 2.0 e pausa preventiva

Entrega local de 21/10/2026. Todas as transferências, instituições, destinatários, códigos e comprovantes são fictícios. Nenhuma consulta ao DICT, Banco Central ou banco; nenhuma transferência real. Esta documentação descreve o que está implementado.

## Auditoria inicial e decisões

A aplicação utiliza scripts clássicos, sem empacotador: transactions.js → state.js → risk.js → app.js → pix.js. O estado é apenas em memória: saldo calculado pelas transações, duas restrições iniciais ilustrativas, sequência local e histórico de interrupções. Não havia localStorage, sessionStorage, backend ou persistência. A recarga reinicia integralmente o cenário com R$ 2.480,50 e 12 lançamentos; essa estratégia foi mantida. Abandonar uma jornada na mesma página preserva o rascunho, mas revoga conferência, pausa e autorização. Voltar à Home ou reabrir Pix não envia dinheiro.

O motor vigente é evaluateRisk() de js/risk.js, com pesos da Etapa 5. O motor ESM em js/guard/ (risk-engine, policy-engine, audit, scenarios) é experimental, independente e continua sem integração ao Pix. Não se trocou um motor pelo outro. Há um adaptador explícito em pix-evidence.js que recebe o resultado vigente e aplica uma política contextual complementar, sem alterar os pesos.

A digitação antiga criava destinatário por formato e permitia selecionar um cenário arbitrário. Isso não representa consulta a uma base interna. Foi substituída por um catálogo local explícito de quatro chaves .invalid, preservando os quatro destinatários e cenários existentes. Chave desconhecida não cria destinatário nem inventa titularidade, reputação ou restrição. A mesma chave, inclusive com maiúsculas, resolve o mesmo ID e respeita as mesmas restrições. A utilidade isDemoKey permanece disponível como validação de formato, mas não autoriza nem localiza um destinatário.

## Arquivos e responsabilidades

| Arquivo | Responsabilidade |
| --- | --- |
| js/transactions.js | Cenário financeiro inicial; inalterado. |
| js/state.js | Contrato monetário, saldo, idempotência e lançamentos; funções monetárias inalteradas. recordInterruptedPix aceita argumento opcional createRestriction, padrão true, para não restringir permanentemente um destinatário por relato contextual. |
| js/risk.js | Motor vigente e restrições iniciais; inalterado. |
| js/guard/* | Motor experimental e auditoria isolados; inalterados. |
| js/pix-directory.js | Catálogo local e consulta por chave ou ID; entrega cópia do destinatário com instituição fictícia. |
| js/pix-messages.js | Biblioteca versionada de dicas e seleção por evidência disponível. |
| js/pix-evidence.js | Coleta explícita, avaliação explicável e política contextual, funções sem DOM, relógio implícito ou mutação dos argumentos. |
| js/pix-journey.js | Máquina de estados com relógio injetável; revisão vinculada aos dados, prazo da pausa e autorização. |
| js/pix.js | Controlador de UI, integração com domínio existente, timer, navegação, conferência, triagem e autorização; preserva renderização/ações das revisões e proteções. |
| js/app.js | Hook de saída/retomada do Pix no navigateTo existente; inclui a identificação financeira explícita no texto copiado do comprovante. |
| index.html / css/style.css | Etapas, formulários, pausa, retomada e estilos com escopo Pix. |

Nenhuma biblioteca nova foi instalada. A ordem dos quatro novos scripts clássicos precede pix.js, preservando o modelo existente.

## Jornada realmente implementada

1. Escolher destinatário cadastrado ou chave fictícia do catálogo. QR Code, Copia e Cola e agendamento aparecem como indisponíveis.
2. Conferir destinatário na base interna. Exibir nome, instituição e chave mascarada; informar inexistência ou restrição ativa. O usuário ainda pode seguir para observar a interrupção do cenário, que nunca autoriza a restrição ativa.
3. Informar valor no padrão brasileiro, com saldo fictício disponível, teto vigente de R$ 2.000,00 e validação monetária. Há uma opção voluntária para verificar suspeita ou pressão.
4. Conferir resumo e marcar a confirmação. Corrigir dados retorna ao formulário e invalida a revisão anterior. O formulário fica oculto nas etapas seguintes para evitar edição ambígua; os valores continuam disponíveis para revalidação final.
5. Avaliar localmente. Cenário moderado, indícios de histórico suficientes, alterações repetidas ou pedido voluntário levam à triagem contextual. Restrição/risco elevado interrompem. Dados inconclusivos não liberam autorização.
6. Exibir pausa preventiva ANTES do código: identificação Guard, título, subtítulo, dica, destinatário, valor, barra, aviso educativo e duas ações. pixConfig.reflectionMs inicia em 5000. Esse parâmetro é experimental, sem validação científica. A barra não simula rede. O término apenas habilita o botão; nunca chama autorização ou registro automaticamente.
7. Autorizar exclusivamente com o código público 0000 e confirmação da operação fictícia. O campo é explicitamente demonstrativo; nunca se solicita senha real. O valor é limpo ao tentar autorizar, sair ou reconsiderar e não é gravado em estado, evidências, logs ou comprovantes.
8. Revalidar revisão, valor, limite, saldo, destinatário canônico, evidências e restrições. Executar recordApprovedPix uma única vez; só mostrar sucesso após retorno do ID esperado. Gerar comprovante com “SIMULAÇÃO — SEM VALOR FINANCEIRO”, também no conteúdo copiado.

A ação “Reconsiderar ou verificar” interrompe a pausa imediatamente e oferece retorno à revisão ou acesso à triagem. O botão “Retomar meu Pix fictício” na triagem preserva os dados e exige nova conferência/pausa. Abandonar outra tela também revoga a autorização. Não há retomada após recarregar.

## Estados e invariantes

Transições normais: draft → recipient → value → confirmation → evaluation → [verification → evaluation] → pause → authentication → completed. evaluation/authentication podem terminar em interrupted. Edição retorna a value; reconsideração/saída retornam a confirmation. O estado independente da máquina é consultado pelo controlador: alterar apenas pixDraft.stage não libera completePix().

A revisão captura ID, destinatário, instituição, chave mascarada e valor. Alterações invalidam a assinatura. O relógio é injetável na máquina para testes; na interface usa Date.now(). O prazo iniciado deve ter terminado antes de authenticate() e authorize(). O timer é cancelado na reconsideração, saída e reset. Sem transição automática. Duplo clique encontra completed após o primeiro registro; o domínio continua protegendo IDs e valores contra duplicação/conflito.

O registro financeiro continua síncrono em memória. O teste de falha injeta uma exceção antes da escrita e verifica ausência de sucesso e de mutação. Não foi implementado banco de dados, tratamento de falha de disco nem rollback distribuído. Uma futura persistência exigirá contrato transacional próprio; isso não é apresentado como já resolvido. Uma pessoa que controla todo o JavaScript do navegador pode modificar o protótipo; o código 0000 e a máquina cliente não são controles de segurança bancária.

## Coleta e política contextual 1.0.0

Cada indicador inclui code, value, source, collectedAt e available. O timestamp é fornecido pelo controlador, em ISO. Sem dispositivo, reputação ou denúncia inventados. As evidências/avaliação/política atuais ficam no rascunho; o histórico de interrupções mantém os motivos e as revisões existentes continuam separadas. Não foi introduzida auditoria durável nem exportação de avaliações.

| Código | Base disponível | Tratamento |
| --- | --- | --- |
| NEW_RECIPIENT | Ausência de Pix concluído com participant.id correspondente na sessão | Sozinho não exige intervenção nem bloqueia; não equivale a afirmar que a pessoa nunca recebeu Pix. Entradas antigas sem ID não são consideradas prova de relacionamento. |
| ATYPICAL_AMOUNT | Pelo menos 3 Pix enviados concluídos; valor maior que 3 vezes a média | Sem amostra, indisponível. Quando ativo, pede verificação; limiar é heurístico configurável em pixPolicyRules. |
| REPEATED_ATTEMPTS | Duas interrupções anteriores para o ID, desconsideradas após retirada da restrição | Pede verificação; não é prova de fraude. |
| OPERATION_CHANGED | Pelo menos duas alterações reais de valor/ID entre conferências na jornada | Pede verificação; não bloqueia sozinho. |
| ACTIVE_RESTRICTION | Restrição interna com status diferente de retirada | Respeita a decisão de interrupção do motor vigente. |
| URGENCY / ADVANCE_PAYMENT / IDENTITY_DOUBT / IGNORE_WARNINGS | Respostas expressas do usuário | Não inventa respostas ausentes; “Não sei” permanece indisponível. |
| SESSION_SIGNAL | Não há telemetria confiável | Sempre indisponível nesta versão. |

A pontuação/classificação do motor vigente é preservada com sua justificativa; sua regra de R$ 1.000,00 continua sendo uma ilustração fixa, não uma inferência estatística do usuário. A avaliação contextual expõe códigos e indisponibilidades, versão e explicações. Os pesos existentes e os novos limiares são heurísticos, sem validação estatística, jurídica ou científica.

Ações:

- ALLOWED: sem motivo para intervenção adicional; não garante segurança. Destinatário novo e valor alto isolados não comprovam fraude.
- NEEDS_VERIFICATION: cenário moderado, evidência contextual, valor atípico com histórico, repetições, alterações ou solicitação voluntária. A triagem pergunta identidade, pressão, adiantamento e instrução para ignorar alertas. Depois das respostas, sinais isolados exigem reconhecimento explícito; o cenário moderado também mantém essa exigência.
- INCONCLUSIVE: alguma resposta é “Não sei”. A pessoa deve verificar por canal independente, reconsiderar ou corrigir as respostas; não há autorização disponível. Não se converte ausência de dados em segurança.
- BLOCKED: motor vigente elevado/restrição ativa, OU pagamento antecipado combinado com pressão/identidade não confirmada/instrução para ignorar alertas, OU identidade não confirmada junto de instrução para ignorar alertas. Combinações são uma política demonstrativa provisória, não prova de crime. Bloqueio apenas contextual registra a tentativa sem criar restrição permanente de destinatário. O comportamento de restrições/revisões dos cenários originais permanece.

Biblioteca justec-education/1.0.0 contém conferência de destinatário, urgência, falsa identidade, falsa central, falsa venda, prêmio antecipado e segurança geral. Só seleciona categorias com evidência correspondente implementada; falsa central/venda estão cadastradas para evolução, mas não são selecionadas sem uma coleta correspondente. Não se afirma que o destinatário é fraudador.

## Execução e testes

No VS Code, abrir index.html pelo Live Server. Selecionar Escola A e valor 50,00, conferir e analisar, aguardar a pausa e escolher continuar. Usar apenas 0000. Escola B demonstra perguntas adicionais; Escola C, restrição; Escola D, falso positivo com revisão existente. Para testar chave, selecionar modalidade e uma das quatro chaves .invalid listadas.

Sem navegador/servidor:

```sh
node --test tests/state-invariants.cjs tests/guard.test.mjs tests/pix-journey.cjs
```

Com Chromium/Playwright já usados no projeto e servidor estático:

```sh
python -m http.server 8790
```

Em outro terminal, definir JUSTEC_TEST_URL=http://127.0.0.1:8790/ e executar os arquivos .cjs de navegador. Neste ambiente também foi necessário JUSTEC_RESOURCE_BRIDGE=1 para obter os mesmos recursos oficiais das CDNs via HTTPS; não há bypass de certificado. No PowerShell, usar $env:JUSTEC_TEST_URL e $env:JUSTEC_RESOURCE_BRIDGE.

As suítes Pix usam 40 ms como configuração para os casos repetidos; tests/pix-2.cjs também executa uma pausa real com os 5000 ms padrão. Os testes puros usam relógio injetado para limites e transições. Isso é registrado para não apresentar todos os casos como esperas reais de cinco segundos.

## Limitações e próximos refinamentos

- Não há persistência; recarga reinicia tudo. Futuras persistência, autorização real e integração ao motor experimental exigem decisões e testes próprios.
- Não há calibração científica dos pesos, combinações ou duração da pausa. Avaliar compreensão e acessibilidade com usuários antes de adotar políticas mais restritivas.
- Não há reputação, sessão/dispositivo ou consultas externas; amostras ausentes ficam indisponíveis. Catálogo é pequeno e intencionalmente fictício.
- O código demonstrativo não é autenticação. Nenhuma integração financeira ou biometria foi criada.
- Testes de teclado, foco, dimensões e preferência por movimento reduzido não substituem auditoria com leitor de tela, dispositivos físicos, Safari ou Firefox.
- As pendências de verificação externa dos canais da Central de Orientação continuam independentes e não foram tratadas como resolvidas por esta etapa.
- Não houve commit, push ou deploy nesta implementação; revisão local antes de eventual publicação.

## Adequação à referência das sete telas e autorização de publicação — 21/10/2026

Após a implementação local, o usuário forneceu uma imagem com sete layouts e autorizou GitHub/publicação. A inspeção identificou que as três primeiras etapas ainda compartilhavam um formulário visível. Foram separadas em seções exclusivas: Iniciar Pix, Destinatário e Valor. Agora o catálogo é conferido na etapa 2 e só uma ação explícita leva ao valor. A conferência é uma ficha de quatro campos; o resultado apresenta nome, instituição, chave mascarada, valor, data e ID, com ação real de compartilhar (Web Share API) ou copiar (Clipboard API), e tratamento de cancelamento/falha. Nenhum destino externo de envio é escolhido automaticamente.

Um indicador de sete etapas acompanha a navegação, e as perguntas adicionais permanecem entre a conferência e a pausa. Foram incluídos teclados visuais para valor e código, mantendo a digitação normal e o teclado numérico do dispositivo. O campo 0000 é visualmente mascarado, mas continua exclusivamente demonstrativo. QR Code/Copia e Cola permanecem desabilitados e identificados. Não se criou recuperação de senha fictícia sem função: o código público é mostrado na autorização. Os dados exibidos são do catálogo, não os nomes ilustrativos da imagem.

A referência orienta sequência e identidade visual, sem adicionar moldura de smartphone ao dashboard responsivo ou copiar alegações de segurança bancária real. Interrupções justificadas podem encerrar a jornada antes da autorização; não se força uma transação bloqueada a atravessar a tela de senha.

Nova suíte tests/pix-layout-sequence.cjs verifica sete layouts exclusivos nas sete larguras, um único layout por etapa, digitação da chave sem perder foco, teclados visuais, resumo, pausa antes do código, registro único, resultado e compartilhamento interceptado. As capturas temporárias em 390 px são /tmp/justec-pix-layout-1.png até -7.png. O teste de compartilhamento intercepta navigator.share: comprova o conteúdo e o vínculo de UI, sem envio real a outra pessoa.

A autorização atual substitui a condição local de não publicação das seções anteriores, que permanecem como histórico. Testes e confirmação de deploy são registrados no Relatório-Mestre principal e na entrega desta etapa.
