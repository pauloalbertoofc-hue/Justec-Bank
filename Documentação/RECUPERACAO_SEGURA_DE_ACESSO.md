# JUSTEC — Recuperação segura de acesso

## Funcionamento

Depois de entrar, abra **Segurança → Proteja seu acesso**. Confirme sua senha atual e selecione **Gerar código de recuperação**. Guarde o código em local privado, preferencialmente no gerenciador de senhas, junto ao pseudônimo. A tela permite copiar e ocultar o código. Ele aparece apenas na geração e não pode ser consultado depois.

O código é válido por **30 dias**, de uso único e exclusivo daquela conta. Gerar outro invalida o anterior. Também funciona para pesquisadores e administradores, sem mudar seus papéis.

Se esquecer a senha: abra **Esqueci meu acesso** na entrada e informe pseudônimo, código guardado e nova senha exclusiva de 12 a 128 caracteres. Após confirmação, entre novamente e gere outro código. Todas as sessões anteriores são revogadas. Contas fictícias, saldo, operações e permissões são preservados.

## Limitações importantes

Esta etapa substitui o planejamento de recuperação automática no documento anterior por uma primeira implementação baseada em segredo prévio. **Não recupera retroativamente quem nunca gerou o código**, perdeu pseudônimo e código, ou deixou o código expirar. Nesses casos, a orientação permanece buscar atendimento com verificação de identidade. Não há redefinição arbitrária pela equipe, recuperação por e-mail ou enumeração pública de usuários. Mudar a variável de bootstrap não troca a senha de uma conta existente.

O código permite redefinir a senha: não envie pelo chat, não compartilhe e não use senha bancária real. O prazo de 30 dias exige renovação; não há lembrete automático nesta entrega. O pseudônimo não é enviado em resposta ao código, pois o fluxo exige ambos.

## Implementação e proteção

- Migração aditiva `004_access_recovery.sql` para SQLite e PostgreSQL: tabela separada; sem recriar banco nem alterar registros financeiros.
- `server/recovery.cjs`: geração aleatória de 256 bits, apenas hash SHA-256 no banco, prazo, rotação e consumo atômico. A senha continua protegida com scrypt.
- `POST /api/auth/recovery-code`: exige sessão válida, origem correta, CSRF e senha atual. Confere novamente sessão e hash da senha dentro da transação após a derivação assíncrona, evitando geração por sessão revogada no intervalo.
- `POST /api/auth/recover`: público porque o usuário perdeu a senha; exige origem, JSON e segredo de recuperação. Resposta uniforme para conta/código inexistente, conta errada, expiração e reutilização. Aplica o limite existente de autenticação (30 chamadas por minuto por endereço de conexão/rota, em memória do processo). Não confiar automaticamente em cabeçalhos de IP encaminhados. Limitação distribuída e validação da topologia do proxy continuam como melhoria de infraestrutura.
- Redefinição da senha, consumo do código, revogação de sessões e auditoria ocorrem na mesma transação. Nenhum código ou senha entra na auditoria.
- Login revalida o hash da senha dentro da transação de criação da sessão: uma derivação com senha antiga iniciada antes de uma recuperação não pode abrir sessão válida depois dela.
- Código não aparece em URL, armazenamento local ou cookies. Respostas da API continuam `no-store`. Só se mostra ao usuário autenticado na geração. Não houve novo provedor nem dependência.

## Validação local

Com Node 24, execute `npm ci`, `npm test`, `npm run test:access` e `npm run test:browser`. A suíte de recuperação também pode ser executada por `npm run test:recovery`.

Para PostgreSQL isolado de testes, configure `JUSTEC_TEST_POSTGRES_URL` privadamente e execute `node --test tests/postgres.cjs tests/recovery.cjs`. Só para PostgreSQL local sem TLS, defina `JUSTEC_TEST_PG_LOCAL=1`. Não use banco de produção para testes. Os testes criam schemas temporários próprios.

Para testar manualmente, use uma conta fictícia: gere código; encerre acesso; recupere com nova senha; confirme que a senha anterior não funciona e o código não pode ser reutilizado. Confira que outra sessão aberta perde acesso na próxima requisição ao servidor. O navegador de outra sessão pode manter conteúdo já renderizado até a próxima requisição; revogação não apaga remotamente uma imagem já exibida.

## Publicação

Entrega preparada na branch local `melhorias-acesso-convites`; o titular autorizou prosseguir com o envio à branch de publicação `laboratorio-multiusuario`. A inicialização aplica a migração aditiva. A versão estática da Vercel permanece separada. Não foram usados dados ou credenciais de produção, nem gerado backup do banco remoto neste ambiente. O envio e a confirmação do deploy são estados distintos, registrados no Relatório-Mestre.

## Confirmação pública

Atualização enviada no commit `fcb0ee923a3b33f7e2bbd574d6a178fbe261a783` à branch `laboratorio-multiusuario`. A verificação externa [42136666531](https://github.com/pauloalbertoofc-hue/Justec-Bank/actions/runs/42136666531), job `127626445551`, concluiu com sucesso e identificou **Published entrypoint recovery-and-invitations-ready**. Foram conferidos saúde PostgreSQL, HTML com recuperação/convites, arquivos novos, CSP, entrada por login e proteção das rotas privadas sem autenticação.

A evidência foi lida pela página pública do GitHub, alternativa à API e ao acesso direto ao Render bloqueados no ambiente. Não houve login, recuperação de conta ou operação financeira de produção nos testes externos. A versão estática `main` permaneceu no commit `837cb414ad27a149c9e0c57004f75af340ba9aec`.

## Resultados executados

- `npm test`: **161 aprovados**, zero falhas ou ignorados.
- PostgreSQL 17 local: **24 aprovados** (17 existentes e sete de recuperação), incluindo consumo concorrente, login simultâneo, rollback de falha na auditoria e HTTP.
- `npm run test:access`: aprovado com geração de convite, cadastro, papel de pesquisador, geração administrativa de código, logout, recuperação e novo login.
- Sintaxe dos arquivos modificados e `git diff --check`: aprovados.
- Nenhum teste autenticado de produção, aparelho físico ou outro navegador foi executado. Não se afirma eficácia de prevenção de golpes a partir desses testes funcionais.
- `npm run test:browser`: aprovado em Chromium/SQLite nas sete larguras, incluindo Pix, extrato bilateral, pesquisa e permissões, após a proteção contra login concorrente.
