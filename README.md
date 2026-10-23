# JUSTEC Bank — laboratório acadêmico multiusuário

Laboratório publicado: **https://justec-laboratorio.onrender.com/laboratorio/**. Saúde PostgreSQL, arquivos públicos e recusa de acesso sem login foram verificados externamente pelo GitHub Actions em 22/10/2026. [Evidência e limites da verificação](Documentação/VERIFICACAO_PUBLICACAO_RENDER_2026-10-22.md). Operações autenticadas em produção ainda dependem do roteiro de aceitação do titular.

No servidor desta branch, `/` abre primeiro o login em `/laboratorio/`. Depois de entrar, o participante usa a Home bancária com seu saldo persistente, Pix, extrato, chaves e educação na mesma navegação. O botão **Administração**, disponível somente à equipe autorizada, abre os instrumentos de gestão e pesquisa. Não existe mais a passagem de uma Home com saldo ilustrativo para outro painel de participante.

A demonstração estática preservada está em `/demonstracao.html`; seus dados continuam ilustrativos. Na branch `main`, mantida para a Vercel, a versão anterior permanece inalterada. [Decisões e testes da interface autenticada](Documentação/INTERFACE_BANCARIA_AUTENTICADA_2026-10-22.md).

Tudo é virtual, sem valor financeiro e sem comunicação com Pix, DICT, Banco Central ou bancos reais. Use apenas pseudônimos, nomes e chaves sintéticos. O código **0000** autoriza somente a operação fictícia; ele não substitui o login.

## Iniciar no VS Code

Requer **Node.js 24 ou superior**, com `node:sqlite`. O modo SQLite local usa módulos nativos. O modo PostgreSQL usa o driver `pg`, fixado no package-lock; execute `npm ci --omit=dev` antes de iniciar nesse modo.

Na raiz do projeto, crie o administrador inicial **uma única vez**. No Bash/WSL/Linux/macOS:

```sh
export JUSTEC_ADMIN_ALIAS=pesquisador-admin
read -r -s -p 'Senha exclusiva do laboratório (12 ou mais caracteres): ' JUSTEC_ADMIN_PASSWORD
export JUSTEC_ADMIN_PASSWORD
npm run bootstrap
unset JUSTEC_ADMIN_PASSWORD
npm start
```

No PowerShell:

```powershell
$env:JUSTEC_ADMIN_ALIAS = 'pesquisador-admin'
$senhaLaboratorio = Read-Host 'Senha exclusiva do laboratório' -AsSecureString
$env:JUSTEC_ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('', $senhaLaboratorio).Password
npm run bootstrap
Remove-Item Env:JUSTEC_ADMIN_PASSWORD
$senhaLaboratorio.Dispose()
npm start
```

Abra **http://127.0.0.1:3000/laboratorio/**. Entre com o pseudônimo e a senha definidos; não existe senha administrativa padrão. O bootstrap recusa recriar ou substituir silenciosamente um administrador existente.

O banco padrão fica em `../.justec-bank-data/justec.sqlite`, fora da raiz pública. Pode ser definido por `JUSTEC_DB_PATH` para um caminho privado em volume persistente. Não use Live Server para o laboratório: ele só serve a demonstração estática e não processa a API.

## Primeiro uso

1. O administrador cria uma sessão na aba **Sessões**.
2. Em **Pesquisa**, gera convite de uso único com papel de participante, pesquisador ou administrador.
3. Cada participante cria acesso com pseudônimo e senha exclusiva, entra e aceita seu convite.
4. Em **Minhas contas**, cria e alterna contas fictícias. A alocação inicial é definida pela sessão e registrada separadamente no livro-razão.
5. Em **Receber Pix**, consulta/copia uma chave interna. Para enviar a outra pessoa, ela deve compartilhar sua chave fictícia da mesma sessão.
6. No Pix: origem → destinatário → valor → conferência → verificação contextual quando cabível → pausa quando configurada → código 0000 e confirmação → comprovante.
7. Recarregue ou saia/entre: os saldos e registros persistem. A autenticação expira após oito horas, mas os dados não são apagados.

“Antes de transferir, confira”, “Tenho dúvida” e “Sofri um golpe” continuam destacados, mesmo sem iniciar uma transferência. Os links abrem os conteúdos originais em nova aba.

## Pesquisa

A aba **Pesquisa** só é disponibilizada para membros autorizados; a API também verifica as permissões.

- Sessões, convites, papéis, estados e políticas auditadas.
- Quatro exemplos editáveis: operação legítima, indícios contextuais, falso positivo e fraude sem sinais observáveis.
- Cenários JSON versionados; contas, histórico-base, operações e verdade experimental separada.
- Condições `none`, `education`, `context`, `behavior` e `integrated`; pausa e pesos/limiares configuráveis.
- Execuções com novas contas e estados-base equivalentes; repetição preserva também a política original e os proprietários.
- Captura e restauração/clonagem de estado em nova sessão, sem apagar resultados anteriores.
- Revisão manual preservando a decisão original, autorrelato opcional, métricas descritivas e exportações JSON/CSV.

Os percentuais são descrições de uma amostra experimental, não comprovação de eficácia. Rótulos secretos não são fornecidos ao Guard. Perfis públicos não equivalem a rótulos de fraude.

## Testes

```sh
npm test
```

Executa testes nativos de domínio, Guard, autenticação, HTTP, concorrência SQLite, migrações e backup. Não requer navegador.

Para testes de navegador, instale as dependências **de desenvolvimento** e Chromium:

```sh
npm ci
npx playwright install chromium
```

Os testes existentes usam `/usr/bin/chromium`; prefira Linux/WSL com esse executável. O laboratório aceita `CHROMIUM_PATH`; para Chromium gerenciado pelo Playwright:

```sh
export CHROMIUM_PATH="$(node -e "process.stdout.write(require('playwright').chromium.executablePath())")"
npm run test:browser
npm run test:legacy
```

Algumas suítes originais ainda fixam `/usr/bin/chromium`; o último comando exige esse caminho. O adaptador HTTPS de CDNs dos testes originais usa `curl`. Os comandos criam servidores e bancos temporários próprios e não modificam o banco do grupo.

## Backup

```sh
export JUSTEC_BACKUP_PATH=/caminho/privado/backups/justec-snapshot.sqlite
npm run backup
```

A cópia usa o backup consistente do SQLite, pode ser feita com o servidor ativo, fica fora da raiz pública e não sobrescreve um arquivo existente. Guarde-a com acesso restrito: contém dados acadêmicos e hashes de autenticação. Para restaurar, pare o servidor e use uma **cópia** do backup como novo `JUSTEC_DB_PATH`, preservando o arquivo anterior. Em recuperação de segurança, revogue as sessões de acesso antes de reabrir o serviço. Backups e atualizações devem ser supervisionados pela equipe.

## Publicação gratuita preparada: Render + PostgreSQL externo

O `render.yaml` da raiz agora seleciona **Render Free**, sem disco e sem banco pago Render. O laboratório usa PostgreSQL externo quando `DATABASE_URL` está configurada, com TLS e validação de certificado. A origem HTTPS é obtida de `RENDER_EXTERNAL_URL`.

O suporte foi implementado e testado com PostgreSQL 17 real, além de preservar SQLite local. **O titular publicou o serviço e a verificação pública confirmou PostgreSQL acessível.** As contas dos provedores foram configuradas pelo titular; este trabalho não contratou planos pagos. A aceitação autenticada em produção permanece pendente.

Siga o [guia de ativação gratuito](deploy/README.md). O administrador inicial pode ser criado no primeiro início usando segredo privado, pois o Render gratuito não oferece Shell. Depois remova o segredo de bootstrap no painel; reiniciar não redefine uma senha existente. Cotas, hibernação e continuidade dos planos gratuitos devem ser conferidas nos provedores.

Se `DATABASE_URL` estiver ausente no Render gratuito, a aplicação recusa iniciar em vez de gravar SQLite efêmero. Sem `DATABASE_URL`, o uso local continua em SQLite. Os bancos são independentes: esta etapa não importa automaticamente dados locais anteriores para o banco novo.

A configuração paga antiga com SQLite e volume permanece como alternativa explícita em `deploy/render-sqlite-paid.yaml`; não é o blueprint padrão. A integração financeira real continua fora do projeto.

Documentação:

- [Diagnóstico inicial](Documentação/LABORATORIO_DIAGNOSTICO_2026-10-22.md)
- [Arquitetura, modelo, regras, API e limitações](Documentação/LABORATORIO_TECNICO_2026-10-22.md)
- [Relatório-Mestre histórico](RELATORIO_MESTRE_JUSTEC.md)

## Versões e material de apresentação

A demonstração anterior é preservada em `main` e `versao-estatica-vercel`, com a tag `prototipo-estatico-2026-10-22`. O laboratório fica na branch `laboratorio-multiusuario`; não mesclar essa branch automaticamente na produção Vercel.

- [Configuração Render, custos a conferir e roteiro de ativação](deploy/README.md)
- [Dois documentos acadêmicos e empresariais em Word, PDF e Markdown](Documentação/Apresentacao/README.md)

O blueprint `render.yaml` usa Render Free com PostgreSQL externo e nenhum volume. A criação do banco e a associação do serviço precisam ser concluídas pelo titular. A URL pública do laboratório e a evidência da verificação estão no início deste README.

## Testes PostgreSQL

Além de `npm test`, execute `npm run test:postgres` com `JUSTEC_TEST_POSTGRES_URL` apontando para banco de testes. A suíte cria schemas aleatórios isolados e os remove; use banco destinado a testes. `npm run test:browser:postgres` executa o mesmo roteiro visual do laboratório com esse banco.

Somente para PostgreSQL local sem TLS, defina `JUSTEC_TEST_PG_LOCAL=1`. Na aplicação local com `DATABASE_URL`, a exceção correspondente é `PG_ALLOW_INSECURE_LOCAL=1`, recusada para host remoto. Nunca desative a validação de certificado em produção.

`npm run backup` continua sendo backup **SQLite**. Se PostgreSQL estiver configurado, recusa criar uma falsa cópia local: use `pg_dump` ou exportação/recuperação do provedor, conforme o guia.
