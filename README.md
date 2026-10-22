# JUSTEC Bank — laboratório acadêmico multiusuário

O projeto oferece duas áreas claramente separadas:

- `/`: demonstração original, com saldo e operações ilustrativos reiniciados ao recarregar.
- `/laboratorio/`: contas, chaves, autenticação, transferências bilaterais, pesquisa e histórico persistidos **no servidor**. Não depende de localStorage para dados bancários.

Tudo é virtual, sem valor financeiro e sem comunicação com Pix, DICT, Banco Central ou bancos reais. Use apenas pseudônimos, nomes e chaves sintéticos. O código **0000** autoriza somente a operação fictícia; ele não substitui o login.

## Iniciar no VS Code

Requer **Node.js 24 ou superior**, com `node:sqlite`. Não há dependências de execução nem necessidade de `npm install` para iniciar o servidor.

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

## Publicação: infraestrutura ainda necessária

O laboratório foi implementado e testado localmente. **Não foi publicado no site atual.** O processo Node e o SQLite exigem armazenamento persistente; o disco temporário de uma função Vercel não atende a esse contrato.

Para hospedar esta implementação, use um servidor/container com volume privado persistente e proxy HTTPS. Configure `JUSTEC_DB_PATH`, `PUBLIC_ORIGIN=https://seu-dominio` (sem barra/caminho), `HOST` e `PORT`. O padrão só escuta `127.0.0.1`. O proxy deve preservar o Host público e a origem; cookies recebem `Secure` quando `PUBLIC_ORIGIN` é HTTPS. Não exponha o processo HTTP diretamente à internet.

Outra opção futura é adaptar o armazenamento para PostgreSQL gerenciado e funções compatíveis com Vercel. Essa migração **não está implementada**. Não foram criados serviços pagos, credenciais públicas nem integração financeira real.

Documentação:

- [Diagnóstico inicial](Documentação/LABORATORIO_DIAGNOSTICO_2026-10-22.md)
- [Arquitetura, modelo, regras, API e limitações](Documentação/LABORATORIO_TECNICO_2026-10-22.md)
- [Relatório-Mestre histórico](RELATORIO_MESTRE_JUSTEC.md)

## Versões e material de apresentação

A demonstração anterior é preservada em `main` e `versao-estatica-vercel`, com a tag `prototipo-estatico-2026-10-22`. O laboratório fica na branch `laboratorio-multiusuario`; não mesclar essa branch automaticamente na produção Vercel.

- [Configuração Render, custos a conferir e roteiro de ativação](deploy/README.md)
- [Dois documentos acadêmicos e empresariais em Word, PDF e Markdown](Documentação/Apresentacao/README.md)

O blueprint `render.yaml` usa uma instância com disco persistente em plano compatível, sujeito a cobrança. A criação do serviço precisa ser concluída pelo titular no Render. Não existe URL de laboratório externo confirmada nesta entrega.
