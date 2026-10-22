---
title: 'JUSTEC Bank e JUSTEC Guard'
subtitle: 'Funcionamento completo, fundamentos de avaliação e proposta de aplicação'
author: 'Projeto JUSTEC Bank | Apresentação acadêmica e proposta de piloto empresarial'
date: '22 de outubro de 2026'
lang: pt-BR
---

# Apresentação da solução

O JUSTEC é um ambiente educacional e experimental voltado à prevenção de golpes em jornadas de transferência. Reúne uma interface de banco simulado, conteúdos de orientação ao consumidor e um laboratório para testar intervenções antes da autorização de uma operação fictícia.

JUSTEC Bank designa a experiência de navegação, contas e transferências virtuais. JUSTEC Guard designa as regras demonstrativas que observam sinais, solicitam verificação, oferecem orientação e podem interromper uma tentativa no laboratório. O conjunto foi desenvolvido para tornar visível o raciocínio das intervenções e permitir o estudo de seus limites.

Não é banco autorizado, conta de pagamento, serviço de Pix real ou ferramenta certificada de detecção de fraude. Não recebe depósitos, não movimenta dinheiro verdadeiro e não consulta sistemas bancários. Seu estágio atual é o de laboratório acadêmico funcional, com validação automatizada de software e implantação pública persistente ainda dependente da infraestrutura.

A proposta à empresa é avaliar um piloto de educação, experiência do usuário e pesquisa com dados sintéticos. Não se propõe instalar diretamente o código no núcleo transacional de uma instituição financeira.

# Problema e hipótese de contribuição

## Por que conferir dados de conta pode ser insuficiente

Uma conta tecnicamente regular pode receber uma transferência motivada por engano ou manipulação. Identificar o recebedor não resolve, sozinho, a pergunta sobre a finalidade legítima daquele pagamento. A pessoa pode acreditar estar ajudando um familiar ou seguindo uma orientação de segurança quando, na realidade, está sob influência de engenharia social.

Da mesma forma, nem toda operação incomum é fraude: uma compra excepcional ou transferência a novo prestador pode produzir sinais de risco legítimos. Um sistema que interrompe tudo pode proteger em alguns cenários e prejudicar usuários em outros. O projeto torna essa tensão observável, incluindo falsos positivos e falsos negativos.

## Hipótese a testar

A combinação de educação acessível, participação contextual do usuário e observações comportamentais pode apoiar decisões mais refletidas antes da autorização, desde que a fricção e os erros sejam avaliados. Essa afirmação é hipótese de pesquisa; os testes de software realizados não comprovam efeito causal sobre vitimização ou prejuízo financeiro.

A pausa preventiva é uma intervenção desenhada para criar oportunidade de revisão. Cinco segundos são um parâmetro experimental padrão, não um tempo cientificamente estabelecido como suficiente para evitar golpes.

# Componentes do sistema

| Componente | Finalidade | Estado atual |
|---|---|---|
| Demonstração pública | Apresentar jornada, serviços fictícios e orientação sem login. | Implementada; versão anterior preservada para Vercel. |
| Núcleo educativo | Triagem, orientação pós-golpe, direitos e MED informativo. | Implementado no protótipo e acessível pelo laboratório. |
| Pix demonstrativo | Sete layouts com conferência, pausa e código de teste. | Implementado no navegador, sem persistência bancária. |
| Laboratório persistente | Usuários, contas, chaves e transações entre participantes. | Implementado e testado localmente. |
| Guard do laboratório | Evidências e política executadas no servidor. | Implementado, explicável e configurável por sessão. |
| Motor experimental isolado | Módulos puros de avaliação, política, cenários e auditoria. | Preservado em js/guard; não confundir com certificação bancária. |
| Painel de pesquisa | Cenários, repetição, revisões, métricas e exportações. | Implementado e restrito por papel. |
| Hospedagem do laboratório | Processo Node e banco privado durável. | Blueprint Render preparado; ativação e ensaio remoto pendentes. |

# Duas experiências, sem confundir seus dados

## Demonstração estática

A raiz do site contém a interface original. O saldo inicial ilustrativo é R$ 2.480,50; o botão de olho alterna exibição e ocultação sem mudar o saldo. A demonstração mantém seu estado no navegador e reinicia o cenário quando a página é recarregada. Não cria conta persistente de participante.

No desktop, o projeto usa navegação lateral e limites de leitura, sem moldura de smartphone. No mobile, adapta cartões e navegação inferior à largura do dispositivo. O projeto preserva navegação, formulários e modais anteriores. O navegador fornece a experiência, mas o código demonstrativo não simula autoridade bancária real.

## Laboratório autenticado

A rota /laboratorio/ oferece a experiência persistente. Dados e permissões são verificados na API. Recarregar não apaga contas, transações ou decisões. Usuários distintos podem interagir na mesma sessão, mantendo titularidade e extratos privados.

O laboratório exige Node 24 e banco de dados; não funciona integralmente em Live Server ou hospedagem apenas estática. A coexistência das duas áreas permite exposição didática simples e experimentos controlados sem substituir a versão anterior.

# Página inicial e orientação preventiva

O título “Antes de transferir, confira.” aparece antes do saldo e conduz a dois caminhos: “Tenho dúvida” e “Sofri um golpe”. A intenção é permitir acesso à orientação mesmo quando a pessoa ainda não abriu o Pix ou já concluiu uma transferência fora do sistema.

Os serviços do protótipo incluem Fazer Pix, Consultar movimentações, Verificar chave Pix, Bloqueios preventivos, Contestações e Central de segurança. Esses atalhos acessam fluxos demonstrativos existentes; seu nome não significa execução de procedimento bancário real.

No laboratório, o bloco educativo permanece acessível antes de operar. Os botões abrem as telas de orientação preservadas em nova aba. Não exigem que a pessoa invente uma transferência apenas para receber ajuda.

# Triagem, pós-golpe, direitos e MED

## Triagem preventiva

A triagem apresenta situações reconhecíveis e recomenda verificações por canal independente. Exemplos relevantes para a discussão incluem pedido de dinheiro de suposto conhecido, falsa central bancária e oferta com cobrança antecipada. O propósito é apoiar reconhecimento e reflexão, não declarar culpa de uma pessoa ou conta.

O usuário não deve informar senha, código de acesso ou documentação real. As respostas do contexto transacional ajudam a avaliar uma tentativa específica, mas podem ser incompletas ou equivocadas: a vítima pode responder sob influência ou desconhecer a situação.

## Orientação após um golpe

A área reúne caminhos informativos para contato com a instituição, preservação de provas, registro de ocorrência e canais de defesa. O conteúdo deve sempre distinguir procedimentos reais, que dependem de bancos e autoridades, das ações internas da simulação.

Interromper um Pix no JUSTEC é impedir um lançamento fictício. Não equivale a bloquear conta real, registrar chave no DICT ou solicitar devolução efetiva. O sistema preservou essa distinção para evitar orientar o usuário como se tivesse executado providência oficial.

## Direitos e MED

A tela de direitos e os conteúdos educativos explicam temas de responsabilidade, defesa do consumidor e Mecanismo Especial de Devolução em caráter informativo. O MED depende das condições e canais oficiais aplicáveis e não garante recuperação do valor. O projeto não abre solicitação real, não decide ressarcimento e não substitui orientação jurídica individualizada.

O material de apresentação não deve atribuir ao JUSTEC competência regulatória ou afirmar que uma interrupção interna cumpre exigências de um banco. Antes de uso institucional, os conteúdos precisam de revisão jurídica e atualização pelas fontes oficiais vigentes.

# Jornada completa do Pix

| Momento | O que o usuário faz | O que o sistema verifica ou apresenta |
|---|---|---|
| Início | Escolhe conta e modalidade disponível. | Origem permitida e caráter de simulação. |
| Destinatário | Informa chave fictícia ou seleciona opção disponível. | Resolução no escopo correto e dados de conferência. |
| Valor | Define quantia virtual. | Formato, positividade e limites do contrato. |
| Conferência | Revisa nome, chave, conta e valor. | Resumo e oportunidade de correção. |
| Prevenção | Responde quando cabível e reconsidera. | Evidências, mensagens, ação e pausa configurada. |
| Autorização | Digita 0000 e confirma a operação fictícia. | Login, titularidade, prazo, política, chave, limite e saldo atuais. |
| Resultado | Consulta comprovante ou motivo de interrupção. | Débito/crédito conjunto ou ausência de movimento. |

A ordem principal é preservada sem números visuais sobre as telas. A intervenção contextual pode acrescentar uma tela entre conferência e pausa. Se houver interrupção ou informação inconclusiva, o sistema não obriga a passar pela senha para produzir um resultado.

O botão de continuar fica disponível após a pausa quando a política permite. O fim da contagem não autoriza a operação. O usuário pode cancelar ou reconsiderar. Erro, abandono e retorno à edição não são tratados como transferência concluída.

No protótipo, o comprovante pode ser compartilhado ou copiado conforme o navegador, com tratamento de falha. No laboratório, o comprovante persistente é consultado pelos titulares envolvidos. Modalidades indisponíveis não foram simuladas como concluídas.

# Usuários, papéis e organização experimental

## Cadastro e acesso

O laboratório usa pseudônimo sintético e senha exclusiva de 12 a 128 caracteres. Não reutilizar senha de banco. Sessão autenticada e sessão acadêmica são entidades diferentes: a primeira representa login temporário; a segunda organiza participantes, regras e resultados do estudo.

Uma autenticação expira após oito horas. Expirar login não apaga dados acadêmicos. O bootstrap cria o primeiro administrador apenas com credencial fornecida pelo operador e recusa recriação silenciosa.

## Papéis

| Papel | Ações principais | Limites relevantes |
|---|---|---|
| Participante | Criar suas contas, administrar chaves, transferir, ver extratos e pedir revisão. | Não acessar contas privadas alheias nem configurações de pesquisa. |
| Pesquisador | Criar cenários, acompanhar execuções, analisar métricas e registrar revisão autorizada. | Não movimentar conta de outro titular nem reescrever a decisão original. |
| Administrador | Gerir sessão, convites, papéis, estado, configuração e alocação virtual. | Ações registradas; não transforma a simulação em operação real. |

Permissões são verificadas no servidor mesmo quando o botão não aparece no navegador. Esconder uma aba não é mecanismo de autorização. Convites têm validade e uso único. O isolamento impede usar uma chave ou conta de outra sessão para contornar regras.

# Contas, chaves e livro-razão

## Múltiplas contas

Cada titular pode criar contas dentro do limite da sessão e selecionar perfis públicos. A política padrão permite cinco contas e alocação inicial de R$ 2.480,50 por conta, podendo ser configurada pelo administrador conforme o ensaio. Esses valores não são depósitos.

Conta nova ou perfil de comerciante não implicam fraude. A situação operacional e o limite de transferência são atributos próprios. Uma restrição interna precisa ser tratada como dado operacional auditado, distinta do gabarito secreto do cenário.

## Chaves internas

Chaves sintéticas são geradas pelo sistema e únicas no escopo da sessão. O domínio .invalid identifica ambiente de teste. Não se cadastra CPF, telefone ou e-mail real. Rotação e desativação têm histórico; a chave é revalidada na autorização para detectar mudança depois da conferência.

## Integridade do saldo

A unidade interna é centavo inteiro. Saldo resulta da soma de lançamentos; não é campo arbitrariamente editável pelo participante. Uma transferência de R$ 250,00 gera −25.000 centavos na origem e +25.000 no destino. O identificador da transferência associa ambas as partidas.

O servidor inicia uma transação, revalida dados e registra tudo ou nada. Saldo insuficiente, violação de limite ou falha ao creditar cancela o conjunto. Idempotência impede que retransmitir a mesma confirmação gere débito adicional. Concorrência é controlada no banco, não pela velocidade do clique.

Alocações, ajustes e restauração são tipos separados. Essa separação evita confundir criação de saldo virtual para experimento com circulação de valor entre participantes. A tesouraria de alocação é conta de sistema e não funciona como destino livre para participantes.

# JUSTEC Guard: três camadas e seus limites

## Educação

A orientação chama atenção antes de transferir e oferece exemplos acessíveis. Não exige pontuação ou anomalia. Sua limitação é depender de exposição, compreensão e contexto: a pessoa pode ignorar ou não reconhecer a situação.

## Contexto informado pelo usuário

Perguntas procuram sinais de identidade não confirmada, urgência, pagamento antecipado e pressão para ignorar alertas. Respostas são evidências declaradas, não fatos certificados. “Não sei” não é convertido em segurança. A política pode solicitar verificação ou considerar a situação inconclusiva.

O sistema não consulta respostas futuras previstas pelo pesquisador para escolher antecipadamente a intervenção. O usuário pode pedir verificação explicitamente; as respostas passam a contar quando fornecidas. O gabarito não participa desse processo.

## Comportamento observável

O motor observa o histórico disponível, destinatário novo, valor atípico, repetição e alterações. Histórico insuficiente reduz o que se pode inferir. O projeto não coleta telemetria bancária externa, reputação nacional de contas, localização ou biometria e não inventa esses sinais.

Um novo destinatário isolado não prova fraude. Perfis públicos não são rótulos de culpa. Pontuação de risco representa aplicação de regras demonstrativas à informação disponível, não probabilidade calibrada de crime.

## Ações e revisão humana

| Ação | Interpretação |
|---|---|
| ALLOWED | A política não exige intervenção adicional impeditiva; não certifica legitimidade. |
| NEEDS_VERIFICATION | É necessário fornecer ou confirmar informação pertinente antes de seguir. |
| INCONCLUSIVE | As informações não permitem liberar a operação naquela condição. |
| BLOCKED | A tentativa é interrompida segundo evidências ou restrição operacional vigente. |

Cada avaliação conserva fase, indicadores, justificativa, pontuação, ação e versão das regras. A revisão posterior é acrescentada, sem apagar a avaliação original. Uma liberação manual não ignora restrição operacional ativa nem requisitos de titularidade ou saldo.

O motor ESM experimental em js/guard permanece disponível isoladamente. Ele e a adaptação do laboratório têm funções de pesquisa distintas; não se deve apresentar a existência de módulos como comprovação de aprendizado de máquina, inteligência artificial preditiva ou certificação antifraude.

# Pesquisa, cenários e reprodutibilidade

## Condições comparáveis

| Condição | Intervenção adicional na jornada |
|---|---|
| none | Sem intervenção adicional, preservando invariantes e restrições operacionais. |
| education | Orientação e pausa, sem decisão por contexto/comportamento. |
| context | Educação e contexto fornecido, sem pontuação comportamental. |
| behavior | Sinais comportamentais e reconhecimento proporcional, sem perguntas contextuais e sem pausa adicional. |
| integrated | Combinação de educação, contexto, comportamento e pausa configurada. |

O acesso à educação inicial é comum. Portanto comparar condições não mede, por si só, efeito de toda educação oferecida. A interpretação deve considerar essa exposição compartilhada.

## Cenários e verdade experimental

Um cenário define contas, perfis, limites, alocações, histórico sintético e operações. O pesquisador rotula a verdade experimental em estrutura separada. Esses rótulos permitem calcular erros depois da decisão, mas não entram nos dados de risco.

Os quatro exemplos incluem transferência legítima, pressão com pagamento antecipado, falso positivo contextual e fraude sem indícios observáveis. Ter fraude sem sinal é essencial: mostra que o sistema não pode detectar o que não observa. Ter operação legítima com sinais semelhantes mostra o custo da interrupção indevida.

## Execução e repetição

Uma execução gera nova sessão e contas, preservando titularidade autorizada. Base, vínculos e política têm identificação por hash. Repetir conserva a política da execução original, mesmo depois de modificar a sessão-mãe. Não se apagam execuções para aparentar melhora.

Capturar estado-base registra contexto necessário; restaurar cria outra sessão e identifica a proveniência do histórico, sem reaplicar as transferências antigas. Mudanças administrativas são auditadas e precisam ser consideradas antes de comparar amostras.

## Indicadores de resultado

Neste sistema, positivo significa operação interrompida. A verdade experimental permite identificar verdadeiros/falsos positivos e negativos. Sensibilidade observada é VP/(VP+FN); bloqueio indevido é FP/(FP+VN), quando os denominadores existem. Pendentes e cancelamentos são separados. Zero observações não significa 0% de falhas.

Tempos, reconsiderações, revisões e distribuições de indicadores ajudam a compreender a fricção. Feedback de compreensão/intenção é autorrelato opcional, não teste validado. A intervenção manual não reescreve o resultado original do algoritmo. Exportações JSON/CSV permitem análise externa autorizada.

# Segurança, privacidade e auditoria

Senhas são derivadas por scrypt e tokens de login armazenados por hash. Cookies protegidos, verificação de origem, CSRF, validação de corpo e autorização reduzem classes conhecidas de erro. O servidor não expõe banco, código privado ou credenciais como arquivo estático. Exportações não contêm segredos de autenticação.

O histórico sensível recebe proteções de imutabilidade por triggers; não é um registro criptograficamente inviolável frente a quem controla o servidor. O rate limit atual é por IP de conexão e processo. Atrás de proxy, participantes podem compartilhar o mesmo limite; deve-se revisar o comportamento observado na hospedagem antes de ampliar público. Não equivale a WAF ou proteção distribuída.

Mesmo dados sintéticos podem produzir metadados de participação e acesso associados a pessoas. Recomenda-se minimização, convites controlados, responsáveis por acesso, retenção definida e backup restrito. Consentimento acadêmico na interface não substitui TCLE, análise ética institucional ou base jurídica apropriada quando aplicáveis.

O software não oferece atualmente MFA, recuperação autônoma de senha, SSO institucional ou certificação de segurança. Esses itens precisam de escopo próprio antes de expansão empresarial.

# Arquitetura e implantação

A interface usa HTML, CSS e JavaScript. O backend usa módulos nativos de Node 24, SQLite com arquivo privado e migrações versionadas. Transferências e revalidações são centralizadas no servidor. Há rotinas de bootstrap, backup e regressão.

A versão estática é mantida em main e no marco prototipo-estatico-2026-10-22; a nova branch é laboratorio-multiusuario. A intenção é manter a Vercel servindo a main, sem trocar silenciosamente o produto público. A configuração do painel Vercel ainda precisa ser conferida pelo titular.

Para o laboratório atual, a opção preparada é Render com uma instância Node e volume persistente. O blueprint exige plano compatível e pode gerar cobrança. A conta do titular precisa aplicar a configuração e criar o administrador pelo Shell. Até isso e a validação da URL, o laboratório não está publicamente confirmado.

Vercel com banco externo é alternativa futura, não configuração equivalente pronta. Exigiria adaptar armazenamento, migrações, concorrência e operação, com novos testes. Publicar apenas HTML ou gravar SQLite temporário não atende à persistência prometida.

Backup consistente está disponível, mas manter cópia no mesmo volume não protege contra perda do próprio volume. Planejar cópia privada externa, restauração ensaiada, atualização supervisionada e responsáveis pela operação. Não armazenar backups ou senhas no repositório público.

# Validação realizada e limites da evidência

Foram aprovados 147 testes automatizados, compostos por 107 testes preservados e 40 novos de laboratório. Nove suítes de navegador do protótipo passaram após integração. O laboratório foi ensaiado em Chromium nas larguras 320, 375, 390, 768, 1024, 1366 e 1920 px.

Os ensaios incluem saldo, extrato, jornada, modais e atalhos; login e permissões; débito/crédito; duplicidade; concorrência em conexões independentes; falha entre partidas; persistência após reinício; pausa; revisões; exportação; isolamento; backup e migrações. A verificação de Secure ocorreu com origem HTTPS configurada, não em uma implantação pública TLS realizada.

Esses resultados sustentam uma demonstração técnica controlada. Não permitem afirmar redução de golpes, eficácia estatística, compatibilidade total entre navegadores, desempenho de alta escala ou conformidade regulatória. Faltam teste de carga, auditoria independente, dispositivos físicos, leitores de tela, Safari/Firefox e estudo com participantes.

# Proposta de aplicação para uma empresa

## Proposta de valor a validar

O JUSTEC pode servir como ambiente de demonstração de experiência preventiva, treinamento e avaliação de mensagens antes do pagamento. A empresa pode observar como participantes compreendem orientações, quando reconsideram e quais intervenções atrapalham operações legítimas. O valor inicial é produzir aprendizagem verificável sobre a experiência, sem expor sistemas reais.

Não se oferece garantia de redução de prejuízo nem percentual de retorno. Benefícios empresariais devem ser formulados como hipóteses: maior compreensão, melhor decisão de verificação, menor fricção desnecessária e maior rastreabilidade da intervenção. Cada hipótese exige métrica e desenho de avaliação.

## Piloto sugerido

| Fase | Entregável | Critério de passagem |
|---|---|---|
| Preparação técnica | Ambiente persistente, HTTPS, papéis, backup e roteiro. | Reinício preserva dados; isolamento e recuperação demonstrados. |
| Revisão do conteúdo | Mensagens claras, acessíveis e revisadas. | Aprovação técnica/jurídica/educacional conforme responsabilidade da empresa. |
| Ensaio interno | Participantes de teste e cenários sintéticos. | Sem erros críticos; documentação de compreensão e fricção. |
| Estudo controlado | Protocolo, amostra justificada e condições comparáveis. | Governança aprovada e plano de análise definido antes da coleta. |
| Análise e decisão | Relatório de acertos, erros, abandono, tempo e limitações. | Decisão conjunta sobre continuidade; sem seleção apenas de resultados favoráveis. |

Prazos, quantidade de participantes e valores dependem da equipe, infraestrutura e protocolo. Este documento não fixa orçamento ou cronograma contratual. O escopo inicial recomendado não inclui conexão com contas reais.

## Responsabilidades propostas

A equipe JUSTEC apresenta o software, mantém regras versionadas, documenta falhas e fornece instrumentos de avaliação. A empresa designa responsável pelo piloto, infraestrutura, revisão de conteúdo, acesso e governança. A instituição acadêmica define exigências de ética e metodologia quando pertinentes. Responsabilidades e propriedade intelectual devem ser formalizadas antes de uso comercial.

## Critérios de aceitação a pactuar

Critérios técnicos: integridade transacional, idempotência, persistência, isolamento, ausência de segredos na exportação e restauração demonstrada. Critérios de experiência: controles acessíveis, compreensão das mensagens e caminho de revisão. Critérios científicos: mesmo estado-base, gabarito separado e publicação de falsos positivos e negativos. Limites numéricos de carga, disponibilidade e desempenho precisam ser definidos e ensaiados; não estão prometidos pelo protótipo.

## Riscos empresariais e medidas

| Risco | Tratamento recomendado |
|---|---|
| Confusão com banco ou proteção real | Marca de simulação, explicação inicial e dados apenas sintéticos. |
| Bloqueio indevido | Revisão humana, justificativas e acompanhamento de falsos positivos. |
| Confiança excessiva em resultado permitido | Mensagem sem garantia e divulgação de falsos negativos. |
| Viés ou contaminação do experimento | Gabarito separado, controle de exposição, ordem e política. |
| Perda de dados | Volume durável, backup privado externo e restauração ensaiada. |
| Escala inadequada | Limitar piloto; avaliar arquitetura/banco antes de expansão. |
| Desatualização de conteúdo | Responsável editorial e revisão por fontes oficiais. |

# Roteiro de apresentação e demonstração

Uma apresentação de aproximadamente quinze minutos pode ser organizada assim: problema e limites; educação antes do saldo; transferência legítima entre duas contas; extratos bilaterais e recarga; tentativa contextual interrompida; revisão preservando o original; e comparação de cenário legítimo com sinais e fraude sem sinais. A duração é sugestão editorial, não resultado de teste de usabilidade.

Para a banca acadêmica, enfatizar hipótese, desenho de condições, verdade experimental, erros e limites de inferência. Para a empresa, enfatizar escopo do piloto, governança, critérios de aceitação, responsabilidades e o que ainda exige desenvolvimento. Não demonstrar somente o cenário em que o sistema acerta.

Preparar usuários e chaves fictícios, backup e ambiente alternativo local. Não projetar senha administrativa. Se a hospedagem não estiver validada, apresentar como demonstração local e não como produção pública.

# Evolução recomendada

Prioridade imediata: implantação persistente, teste remoto completo, restauração, revisão de limite por proxy e documentação operacional. Em seguida: acessibilidade e linguagem, observabilidade, segurança independente e protocolo de pesquisa. Depois: avaliação com participantes e análise que inclua erros e fricção.

Expansão arquitetural pode envolver PostgreSQL gerenciado, múltiplas instâncias, jobs e limitação distribuída. Integrações bancárias, autenticação institucional e tratamento de dados reais são projetos posteriores com requisitos próprios. O sucesso de um piloto sintético não autoriza essa expansão automaticamente.

# Referências, fundamentos e cuidado com alegações

Fontes primárias: código e testes do JUSTEC, Relatório-Mestre, documentação técnica de 22/10/2026, Estratégia Integrada e Proposta de Laboratório fornecidas pelo grupo. São as bases do relato de implementação.

Para aprofundamento acadêmico e institucional, recomenda-se consultar as fontes abaixo. Elas orientam revisão futura e não foram utilizadas para afirmar certificação, aderência integral ou eficácia do JUSTEC:

- Banco Central do Brasil. Portal Pix e orientações oficiais sobre segurança e MED: https://www.bcb.gov.br/estabilidadefinanceira/pix. Confirmar regras e redação vigentes antes de apresentação institucional; disponibilidade e conteúdo remoto não foram certificados neste trabalho.
- Brasil. Lei nº 8.078/1990, Código de Defesa do Consumidor. Base geral para discussão jurídica, sem substituir análise do caso concreto.
- Brasil. Lei nº 13.709/2018, Lei Geral de Proteção de Dados Pessoais. Referência para governança de dados em eventual estudo ou parceria; este documento não é parecer de conformidade.
- NIST. The NIST Cybersecurity Framework 2.0, 2024. DOI: 10.6028/NIST.CSWP.29. Referência de gestão de riscos, não certificação do produto.
- OWASP. Application Security Verification Standard: https://owasp.org/www-project-application-security-verification-standard/. Referência para construir futura revisão independente de controles.
- Kahneman, D.; Tversky, A. Prospect Theory: An Analysis of Decision under Risk. Econometrica, 47(2), 1979, p. 263–291. DOI: 10.2307/1914185. Referência geral sobre decisão sob risco; não valida a duração da pausa nem demonstra efeito deste software.

Este documento não atribui ao projeto resultados de estudos alheios. Não foram fabricados casos judiciais, estatísticas de perda ou avaliações de usuários. Para uma monografia, o grupo deve complementar o material com revisão bibliográfica formal, normas institucionais de citação e pesquisa empírica adequada.
