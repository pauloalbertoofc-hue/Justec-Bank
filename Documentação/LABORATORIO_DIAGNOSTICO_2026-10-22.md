# Diagnóstico inicial — Laboratório JUSTEC, 22/10/2026

Lidos integralmente o pedido colado, a Proposta de Laboratório Multiusuário e a Estratégia Integrada de Prevenção. Os documentos se dizem propostas; a instrução direta do usuário aprova o escopo e autoriza implementação incremental, sem tratar aprovação como validação científica.

## Estado inicial

HEAD 837cb41. Aplicação estática HTML/CSS/JavaScript clássico, Tailwind/FontAwesome/fontes via CDN, sem package.json na raiz, servidor, autenticação ou persistência. state.js mantém saldo e extrato em memória; recarga reinicia o cenário. Pix 2.0 tem sete telas, catálogo fixo, máquina de estados, pausa, código 0000, validação em centavos e idempotência local. pix-evidence.js coleta e explica indicadores contextuais; risk.js é o motor ilustrativo vigente. js/guard é motor ESM experimental isolado, com auditoria pura. Não há cadastro autenticado de pessoas/contas nem crédito ao destinatário.

## Reaproveitamento e adaptação

Preservar a demonstração e seus testes; preservar a Home “Antes de transferir, confira”, triagem, direitos e orientação MED. Reutilizar identidade visual, mensagens preventivas e coleta/política do Pix. Operações persistentes precisam de autoridade no servidor: o saldo cliente, catálogo fixo e código 0000 não podem autenticar participantes nem autorizar movimentações isoladamente.

## Decisões e migração

1. Servidor Node.js 24 com módulos nativos HTTP, crypto e node:sqlite, sem frameworks ou dependências de execução.
2. SQLite em arquivo privado, migrações SQL versionadas, foreign keys, WAL, busy_timeout e BEGIN IMMEDIATE. Saldo calculado por livro-razão inteiro e imutável. Débito/crédito na mesma transação.
3. Autenticação por pseudônimo, scrypt, cookie de sessão opaco HttpOnly, expiração e CSRF. Papéis e propriedade verificados no servidor.
4. Área /laboratorio para sessões persistentes, contas, chaves, jornada Pix e pesquisa; o protótipo estático permanece como demonstração explicitamente separada. Não converter saldos antigos ilustrativos em dados de participantes automaticamente.
5. Adaptador do Guard compartilha coletor/política contextual, mas recebe apenas observações do livro-razão e respostas. Rótulos secretos ficam em tabelas separadas e rotas de pesquisa. O ESM experimental continua separado até validação de integração.
6. Cenários com estados-base versionados; cada repetição gera novo ambiente/run, sem apagar execuções anteriores. Exportações e métricas identificam denominadores, amostras e limitações.

## Etapas verificáveis

Fundação (SQL/auth/permissões) → contas/chaves → transferência/livro-razão → Guard/pausa no servidor → cenários/repetição/métricas → UI de participante e pesquisa → integração/regressões/documentação. Cada etapa será registrada no Relatório-Mestre.

## Riscos e limites de infraestrutura

O SQLite exige disco persistente e processo de servidor; não funciona como banco durável no filesystem efêmero da Vercel. Não há credenciais de PostgreSQL gerenciado fornecidas. A implementação pode ser executada e validada localmente, mas publicação persistente requer volume/hospedagem adequados ou migração posterior a PostgreSQL. Não será criada uma falsa persistência baseada no navegador. HTTPS, backup e operação do servidor devem ser configurados na hospedagem. Não se presumem eficácia antifraude, conformidade regulatória ou autorização ética para coleta com participantes reais.

## Linha de base executada antes das alterações

107 testes unitários aprovados (estado, Guard ESM e jornada/política). Nove suítes de navegador: balance, statement, pix, pix-2, pix-layout-sequence, layout, guard-content, shortcuts e consumer-guidance; todas com exit 0. Chromium e servidor estático 8820, com JUSTEC_RESOURCE_BRIDGE=1. Logs temporários /tmp/justec-lab-baseline-*.log e /tmp/justec-lab-baseline.json. Dados de sites oficiais são interceptados nos testes existentes, não revalidados externamente.
