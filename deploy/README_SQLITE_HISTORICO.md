# Publicação separada: Vercel e Render

## Versões no GitHub

- `main`: versão estática anterior, preservada no commit `837cb414ad27a149c9e0c57004f75af340ba9aec`. Continua sendo a origem pretendida da produção Vercel; não houve alteração de suas configurações no painel.
- `versao-estatica-vercel`: cópia identificada desse mesmo commit, para consulta/recuperação.
- tag `prototipo-estatico-2026-10-22`: marco imutável convencional da versão anterior (não mover a tag).
- `laboratorio-multiusuario`: laboratório persistente, testes, documentação e blueprint Render. **Não mesclar automaticamente na main nem selecionar essa branch como produção Vercel.**

O `vercel.json` da nova branch desabilita deployments Git de `laboratorio-multiusuario` na Vercel, evitando tratá-la como preview estático. Não altera o arquivo da `main` nem configurações do projeto por API.

A configuração real da Production Branch no painel Vercel ainda precisa ser conferida pelo titular: deve apontar para `main`. A API GitHub não mostrou deployments do projeto; isso não comprova a configuração do painel Vercel. A consulta pública ao domínio foi recusada pela rede deste ambiente, portanto a disponibilidade remota não foi certificada nesta entrega.

## Por que não hospedar o laboratório atual na Vercel?

O projeto usa um processo Node 24 e um arquivo SQLite durável com WAL. Funções Vercel não oferecem esse arquivo como armazenamento persistente compartilhado entre execuções. Servir somente o HTML produziria tela sem API; usar disco temporário perderia dados. A versão estática pode continuar na Vercel. Uma adaptação futura para Vercel exigiria banco externo e revalidação de transações, migrações e concorrência; ela não está implementada.

## Publicar no Render usando a conta do titular

O arquivo `render.yaml` já descreve servidor Node, disco persistente de 1 GB e verificação de saúde. **Usa serviço Starter e volume, sujeitos à cobrança do Render.** Conferir valores e condições no painel antes de confirmar; não foi contratada infraestrutura por este trabalho. Uma única instância acessa o SQLite. Não substituir o volume por disco efêmero.

1. Entrar em https://dashboard.render.com e escolher **New → Blueprint**.
2. Autorizar o acesso ao repositório `pauloalbertoofc-hue/Justec-Bank`, se solicitado.
3. Selecionar explicitamente a branch **`laboratorio-multiusuario`** e o arquivo `render.yaml` na raiz. A `main` não contém esse arquivo, por preservação da versão anterior.
4. Conferir plano, região, volume e estimativa de custo; só então aplicar o blueprint.
5. Aguardar build e health check. O comando usa `RENDER_EXTERNAL_URL` como origem HTTPS. Para domínio próprio, definir `PUBLIC_ORIGIN=https://dominio-escolhido`, sem barra ou caminho, configurar o domínio no Render e reiniciar.
6. Abrir **Shell** do serviço (não o pre-deploy, que não tem o volume montado) e criar o primeiro administrador uma única vez:

```sh
export JUSTEC_ADMIN_ALIAS=pesquisador-admin
read -r -s -p 'Senha exclusiva (12 ou mais caracteres): ' JUSTEC_ADMIN_PASSWORD
export JUSTEC_ADMIN_PASSWORD
npm run bootstrap
unset JUSTEC_ADMIN_PASSWORD
```

Não cadastrar essa senha no GitHub, nos documentos ou no chat. O bootstrap recusa recriar administrador existente. Não há administrador automático ou senha padrão.

7. Abrir a URL exibida pelo Render, acrescida de `/laboratorio/`, e entrar com o acesso criado. O link `/api/health` deve retornar JSON com `simulation: true` e versão.
8. Criar sessão, dois participantes e contas; enviar Pix fictício e conferir extratos bilaterais. Recarregar; reiniciar o serviço pelo painel; confirmar persistência e ausência de duplicidade. Testar rejeição de acesso alheio e fluxo de revisão.
9. Guardar backup privado e praticar recuperação antes de apresentações ou estudos. Exemplo no Shell, usando destino novo no volume: `JUSTEC_BACKUP_PATH=/var/data/justec/backup-AAAA-MM-DD.sqlite npm run backup`. Esse backup no mesmo disco não substitui uma cópia privada externa; não publicar o arquivo como artifact GitHub.

Atualizações automáticas estão desativadas no blueprint. Fazer deploy manual da branch do laboratório após testar; preservar backups e aplicar migrações versionadas. Disco único não oferece escalabilidade horizontal. Planejar indisponibilidade durante atualizações e não presumir rollback de esquema por voltar um commit.

## Estado da implantação

O blueprint está preparado; a publicação externa só estará confirmada após criação do serviço e validação da URL do Render. Ter uma conta Render não autoriza tecnicamente este ambiente a controlá-la: não existe conector ou credencial Render disponível. Não foi criado serviço, volume, cobrança ou URL de laboratório em nome do usuário. Os testes locais não substituem a verificação em nuvem.
