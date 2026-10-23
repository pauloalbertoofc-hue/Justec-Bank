# JUSTEC — login anterior à Home e interface bancária persistente

22/10/2026, horário de São Paulo. Ajuste solicitado a partir de cinco capturas do titular. A primeira mostrava a demonstração estática; as demais, o painel do laboratório, autenticação e criação de conta.

## Problema e decisão

Antes, a raiz mostrava uma conta ilustrativa sem login e o participante precisava abrir outra área para usar dados persistentes. O login do laboratório ficava depois do bloco educativo e o participante recebia a apresentação de gestão da pesquisa. Isso não correspondia à experiência bancária pedida.

A raiz do servidor agora redireciona para /laboratorio/ antes da Home. HTML inicial mostra somente acesso/cadastro recolhido, marca e aviso acadêmico, sem saldo pessoal ou navegação bancária. Uma sessão já autenticada é retomada após verificação da API. Depois de entrar, a Home usa os dados do titular e da conta selecionada, sem Ana Paula ou saldo fixo embutidos.

A apresentação segue a referência: cabeçalho azul, rota de segurança acima do saldo, cartão escuro com borda amarela, botão de olho, extrato, seis serviços, navegação inferior mobile e lateral desktop. Protótipo mobile artificial não foi reintroduzido. Ícones SVG locais dispensam CDN ou biblioteca nova. Foi mantida a identificação de simulação; proteção demonstrativa não é garantia contra golpes.

## Separação da equipe

O modo padrão, inclusive para administrador, é o banco. O botão Administração alterna para o painel anterior de sessões, contas, revisões e pesquisa. Apenas administrador global ou membro pesquisador/administrador autorizado vê esse acesso. A API continua verificando papéis e propriedade: esconder o botão não é a autorização. Pesquisadores mantêm somente suas permissões já existentes; não ganharam poder administrativo ou de movimentar conta alheia.

Participantes têm interface bancária para contas/chaves próprias e convite, com rótulos simplificados. Perfil técnico, configuração de sessão e pesquisa ficam no painel de equipe. O cadastro de acesso continua disponível como opção recolhida no login, sem permitir escolher papel privilegiado. O convite segue necessário para adesão a um ambiente. O administrador sem conta ou sessão é orientado a configurar o ambiente, sem criar alocações automaticamente.

## Fluxos preservados

- Home e saldo consultam a API; ocultar saldo altera somente apresentação, com rótulo acessível, sem mutação financeira.
- Pix persistente mantém a sequência existente: destinatário, valor, conferência, Guard, pausa, autorização 0000 e resultado. Login é a senha exclusiva; 0000 continua apenas código de teste da operação.
- Extrato, chaves, contestações, revisões e tarefas continuam usando as mesmas rotas e validações.
- Triagem, pós-golpe, direitos e centro educativo são abertos na mesma navegação bancária. Os textos vêm das seções do index.html preservado; o importador seleciona apenas a seção, remove scripts/handlers inline e reconecta uma lista fechada de ações sem eval. Não executa a máquina financeira da demonstração dentro do banco.
- Modais de triagem e roteiro MED usam dialog nativo com Escape/fechamento; links oficiais e detalhes permanecem. Nota adicional distingue revisão persistente da demonstração.
- Logout/401 param o temporizador, limpam workspace, conta, rascunho, código CSRF, chaves de idempotência da UI e identidade exibida. Dados no servidor permanecem.

A demonstração original passa à rota identificada /demonstracao.html no servidor; não é uma conta persistente. Ela também fornece os textos educativos ao importador. A branch main/Vercel não é modificada. O executador de regressões opta explicitamente pela entrada demo para testar o protótipo original.

## Arquivos

laboratorio/bank.js (apresentação, ícones, Home, educação, segurança e consulta de chaves); laboratorio/app.js (entrada, modo, navegação e limpeza de sessão); laboratorio/index.html (login primeiro e shells); laboratorio/lab.css (layout e responsividade); server/http.cjs (redirecionamento e rota demo); server/run-regressions.cjs (entrada demo explícita); testes e workflow público. Nenhuma migração ou regra de saldo, risco, transferência, revisão ou autorização foi alterada.

## Validação executada

154 testes gerais aprovados, zero falhas/ignorados. Incluem teste novo de redirecionamento da raiz e /index.html, preservação de query educativa, login sem Home prévia e rota demo. Um teste anterior esperava educação antes do login; foi atualizado para o requisito novo, mantendo as verificações de CSP e arquivos privados.

17 testes PostgreSQL 17 real aprovados, incluindo concorrência, rollback, idempotência, revisão, persistência e isolamento. Navegador Chromium aprovado com SQLite e PostgreSQL: login pela raiz, Home da conta própria, olho sem alterar saldo, criação de conta, transferência bilateral, extrato, revisão/pesquisa autorizadas, recarga e logout.

Sete larguras: 320, 375, 390, 768, 1024, 1366 e 1920 px. Em cada uma, abertas Home, ambientes, contas, extrato, revisões, triagem, pós-golpe, direitos, centro educativo, segurança e chaves; verificadas ausência de rolagem horizontal e navegação. Modais de diagnóstico e roteiro MED abertos/fechados, inclusive Escape. Jornada Pix completa repetida, com controles acessíveis e saldo debitado/creditado. Nove suítes originais aprovadas separadamente na entrada demo.

Ensaios intermediários identificaram expectativa antiga do teste HTTP e espera por saldo na conta de administrador sem conta; ajustados para o novo contrato, sem inventar conta/saldo. Inspeção visual revelou herança de fundo genérico nos botões preventivos: corrigida com cores explícitas. Captura final local com dados sintéticos em Apresentacao/figuras/banco-autenticado-390.png. R$ 2.000,00 é valor da fixture, não alteração do saldo padrão ou da conta do titular.

## Publicação e limites

Atualização preparada na branch laboratorio-multiusuario. O Render pode exigir Manual Deploy → Deploy latest commit porque o blueprint usa deploy manual. Push não será descrito como aplicação em produção. O workflow público agora informa a geração da entrada: login-first ou legacy-entry-awaiting-deploy, usando requisições GET sem credenciais. A infraestrutura publicada anterior já foi validada, mas os dados reais de login do titular não foram usados.

Não houve envio de dados/credenciais de produção, estudo de eficácia, teste em aparelho físico ou leitura assistiva formal. Safari/Firefox e aceitação autenticada remota continuam pendentes. O código de negócio e o PostgreSQL existente não exigem recriar contas, trocar senha ou substituir banco por causa desta mudança de interface.
