# Ativar JUSTEC: Render gratuito + PostgreSQL gratuito

A branch `laboratorio-multiusuario` agora suporta PostgreSQL real. O blueprint raiz usa `plan: free`, sem disco e sem recurso de banco pago no Render. A versão anterior continua em `main`/`versao-estatica-vercel` para a Vercel; não fazer merge automático.

**Estado:** código pronto e ensaiado localmente com PostgreSQL 17. O titular informou ter criado a conta PostgreSQL; o provedor/projeto e sua conexão ainda precisam ser identificados e associados ao Render. Não há credencial de controle Render disponível nesta sessão. Nenhum serviço externo novo, URL pública ou gratuidade permanente foi confirmado. Os provedores podem mudar cotas, hibernar ou suspender recursos; conferir o plano exibido antes de criar. Não habilitar serviços pagos para seguir este guia.

## 1. Criar o banco gratuito no Neon

1. Abrir https://console.neon.tech e entrar/criar conta, podendo usar GitHub.
2. Criar projeto no plano **Free**, com nome de sua escolha, por exemplo `justec-laboratorio`.
3. Escolher região próxima da região do serviço Render; usar PostgreSQL 17 se disponível.
4. Em **Connect**, selecionar conexão **direta** (pooling desativado). O próprio aplicativo mantém pool limitado a quatro conexões; a conexão direta evita incompatibilidade de parâmetros de inicialização em poolers.
5. Copiar a connection string PostgreSQL para o campo secreto `DATABASE_URL` do Render. Essa string contém senha: não colar no chat, GitHub, documentos ou captura de tela.

O Supabase pode ser usado como alternativa PostgreSQL, desde que a conexão permita acesso TCP do Render com certificado TLS válido. Conexões diretas IPv6/poolers possuem particularidades a conferir no provedor. O teste executado aqui foi PostgreSQL 17 local, não uma conta Neon/Supabase real.

Não usar o PostgreSQL temporário do Render como se fosse armazenamento gratuito permanente; conferir prazo/regras do serviço antes de escolher qualquer banco. Não criar dois bancos para este roteiro.

## 2. Criar/atualizar o serviço gratuito no Render

1. Abrir https://dashboard.render.com → **New → Blueprint**.
2. Selecionar `pauloalbertoofc-hue/Justec-Bank`, branch **`laboratorio-multiusuario`**, arquivo `render.yaml` na raiz.
3. Conferir que está selecionado **Free**, sem disco e sem banco Render. Se já existe serviço antigo pago, não presumir que mudar o YAML elimina cobranças antigas: conferir recursos no painel e preservar dados antes de remover algo.
4. Preencher os campos secretos solicitados:

| Variável | Configuração |
|---|---|
| DATABASE_URL | Conexão privada do PostgreSQL externo. |
| JUSTEC_ADMIN_PASSWORD | Senha exclusiva do laboratório com 12–128 caracteres; não reutilizar senha bancária. |
| JUSTEC_ADMIN_ALIAS | Pseudônimo do administrador inicial; padrão `pesquisador-admin`. |

Node 24, HOST e comandos já estão no blueprint. A origem pública é detectada por `RENDER_EXTERNAL_URL`. Para domínio próprio, configurar `PUBLIC_ORIGIN=https://dominio` sem barra/caminho e associar o domínio no Render.

5. Aplicar o blueprint e aguardar build/deploy. Não instalar dependências de desenvolvimento; o comando `npm ci --omit=dev` instala o driver PostgreSQL fixado no lock.
6. Se já houver serviço configurado manualmente: selecionar branch correta, plano Free, build `npm ci --omit=dev`, start `node server/index.cjs`, health `/api/health`, HOST `0.0.0.0`, Node 24 e os segredos acima. Nenhum arquivo SQLite precisa ser enviado ao Render.

## 3. Primeiro administrador sem Shell

No primeiro início, o segredo `JUSTEC_ADMIN_PASSWORD` cria o administrador somente se nenhum administrador global existir. A operação é transacional e serializada no PostgreSQL, inclusive com inícios simultâneos. Nenhuma senha ou connection string é impressa nos logs.

Após login funcionar, **remover `JUSTEC_ADMIN_PASSWORD` do painel Render** e fazer novo deploy. O usuário continua no PostgreSQL. Deixar ou alterar essa variável posteriormente não redefine a senha de administrador existente; ela não é ferramenta de recuperação de senha. O alias de inicialização também não renomeia contas já criadas.

Não usar Shell como etapa obrigatória: o plano gratuito pode não disponibilizá-lo. Como alternativa, o operador pode executar `npm run bootstrap` em seu computador, com a mesma `DATABASE_URL` em ambiente privado. O CLI continua recusando recriar administrador existente.

## 4. Confirmar funcionamento na URL real

- `/api/health`: retorna `simulation: true`, versão `justec-lab/1.1.0` e `storage: postgres`. O endpoint testa consulta ao banco; falha de conexão não deve ser considerada saúde aprovada.
- `/laboratorio/`: entrar com pseudônimo/senha criados, criar sessão e convites.
- Criar dois participantes e contas sintéticas, enviar Pix e conferir débito/crédito nos dois extratos.
- Recarregar e reiniciar o serviço no Render; os dados devem continuar no banco externo.
- Testar uma interrupção, revisão autorizada e exportação. Acesso privado de outro titular deve ser recusado.

Somente após executar esse roteiro registrar a implantação como aprovada. Enviar apenas a **URL pública do serviço** para conferência, nunca segredos de banco ou de login. Não existe URL nova confirmada na entrega de código.

O serviço gratuito pode hibernar; uma abertura após inatividade pode demorar. Não prometer disponibilidade contínua ou carga ilimitada. As cotas do banco também precisam ser acompanhadas. Não foram usados pings artificiais para impedir suspensão.

## 5. Persistência, backups e limites

O processo do Render pode ser substituído sem transportar banco em arquivo: usuários, contas, sessões, livro-razão e auditoria estão no PostgreSQL. Arquivos temporários do serviço não são cópia dos dados.

`npm run backup` é específico do SQLite e recusa executar no modo PostgreSQL. Para PostgreSQL, usar `pg_dump` com cliente compatível com a versão do banco, credenciais em ambiente privado e destino privado; ou ferramentas do provedor. Recuperação automática e retenção oferecidas pelo plano gratuito não foram certificadas. Ensaiar restauração em banco separado antes de estudo com pessoas. Não publicar dumps no repositório.

Dados SQLite anteriores não são importados automaticamente. Antes de eventual migração de dados existentes, fazer backup e planejar importação própria com conferência do livro-razão. Esta implantação começa com banco externo novo.

## 6. Implementação e testes

- `server/postgres.cjs`: driver `pg`, pool limitado, TLS verificado, parâmetros vinculados, transações e migrações.
- `server/flow.cjs`: uma única implementação de domínio que mantém execução síncrona local e aguarda consultas PostgreSQL sem bloquear a rede/event loop.
- `server/migrations-postgres/`: esquema, checks, ordem estável do livro-razão e triggers imutáveis.
- `server/bootstrap-admin.cjs`: bootstrap único; `index.cjs` seleciona armazenamento e inicializa serviço.
- `tests/postgres.cjs`, `storage-flow.cjs` e navegador: testes específicos e regressões.

As mutações são serializadas por advisory lock transacional no PostgreSQL, adquirido na mesma conexão usada por AsyncLocalStorage. É uma escolha para laboratório pequeno, equivalente à serialização de escrita anterior; não demonstra escalabilidade bancária. Não usa trava apenas em memória de um processo.

A configuração paga anterior está arquivada em `deploy/render-sqlite-paid.yaml`, com permissão explícita para SQLite em volume. Ela não é usada pelo blueprint gratuito. O guia antigo foi preservado como histórico em `deploy/README_SQLITE_HISTORICO.md`.
