# JUSTEC — Revisão integrada e organização do painel de pesquisa

## Entrega

Reúne o acompanhamento das jornadas, pares controlados de duração e registro mínimo opcional da pausa. Acrescenta organização do painel e revisão de compatibilidade antes da publicação autorizada. Publicação confirmada externamente conforme o registro ao final deste documento. Passar nos testes locais e enviar ao GitHub não foi tratado como confirmação suficiente: a versão foi conferida no endereço público.

## Como usar

Entre no laboratório com seu acesso existente e selecione **Administração → Pesquisa**. A área continua restrita aos papéis autorizados no ambiente.

| Área | Conteúdo |
|---|---|
| **Configuração** | Convites, papéis, condições operacionais, editor de cenários, captura e restauração de estado-base. Controles administrativos permanecem limitados ao administrador. |
| **Execução** | Criar execução individual ou par, escolher duração e ativação opcional do registro, abrir roteiros e repetir bases existentes. |
| **Resultados** | Matriz descritiva, todas as jornadas, sinais de abertura/saída, comparação dos lados do par, notas e auditoria. |

Os botões da navegação são controles nativos, operáveis por teclado; indicam a área selecionada e mostram somente uma seção por vez. A seleção é lembrada durante o uso daquele ambiente e reiniciada ao trocar de ambiente ou sair. Não é uma permissão: a API continua verificando os papéis.

Depois de preparar cenários, o painel mostra Execução. Depois de criar um par, mostra Resultados e os botões para abrir cada lado. Exportações JSON e CSV continuam acessíveis no cabeçalho.

O roteiro de demonstração é texto expansível, sem criação automática de dados. O botão de exemplos foi renomeado para **Adicionar quatro cenários fictícios**, evitando sugerir validação científica inexistente.

## Roteiro de demonstração sintética

1. Na Configuração, conferir o ambiente e adicionar os cenários fictícios ou salvar uma cópia editada. Usar somente identidades e valores virtuais.
2. Na Execução, escolher um cenário legítimo, um suspeito ou um falso positivo. Para comparar a espera, criar um par: mesmo modo/base/regras, espera de 0 ms e duração escolhida.
3. Manter o registro da pausa desligado, salvo ativação explícita para a demonstração. A opção é desmarcada por padrão e aplicada igualmente aos dois lados do par. Antes de envolver pessoas, tratar protocolo e consentimento/revisão institucional aplicáveis.
4. Abrir a operação ou roteiro e percorrer conferência, verificações quando cabíveis, pausa, código fictício 0000 e resultado. Usar também a reconsideração para observar seu desfecho separado.
5. Voltar a Resultados e conferir totais atribuídos, operações não iniciadas, em andamento, concluídas, interrompidas e canceladas. Não transformar cancelamento em fraude evitada ou falta de registro em abandono.
6. Exportar JSON para conservar vínculos dos pares e sinais. CSV permanece por operação; usar runId para relacioná-lo aos vínculos do JSON.

Uma pausa de 0 ms mantém tela educativa e autorização explícita. Os pares de duração aceitam educação, contexto e integrado. O modo comportamental continua em execuções individuais, mas não nos pares porque aplica espera efetiva de 0 ms.

## Correção encontrada na revisão

O formulário de política/estado enviava sempre o JSON de configuração. Ao tentar arquivar uma execução, o backend retornava `RUN_CONFIG_FROZEN`/HTTP 409, mesmo quando o objetivo era somente mudar o estado. A proteção do backend estava correta; o pedido do formulário estava errado.

O relatório autorizado agora informa `configurationFrozen`, calculado com a mesma condição do backend. A interface apresenta a configuração experimental como somente leitura e, ao arquivar/encerrar, envia apenas `status`. Ambientes de origem continuam podendo ter sua configuração editada por quem já tinha essa permissão. Nenhuma proteção de configuração foi removida.

Teste de navegador reproduziu o HTTP 409 antes da correção. Depois, o mesmo fluxo arquiva com HTTP 200, mantém configuração somente leitura e continua a execução do outro lado do par. A auditoria e os avisos de ambiente alterado são preservados.

## Compatibilidade e preservação

A revisão não recria banco, não altera saldos ou senhas e não acrescenta migração além das quatro já presentes na versão publicada anterior. O registro opcional continua desligado para configurações antigas sem essa propriedade.

`npm run test:upgrade` prepara um banco SQLite sintético usando o código real do commit publicado anterior `300ba15c722797fc661b4e1e1cbcfd84db81e269`, fecha-o e abre-o com a versão nova. Confere login/sessão antigos, papéis, saldos de todas as contas, comprovante, métricas, repetição fiel de configuração antiga e novas rotas de relatório. Usa diretório temporário, removido ao terminar, e não consulta produção. Esse ensaio exige histórico Git com o commit indicado e o utilitário tar; não é etapa de inicialização do aplicativo.

O ensaio de banco antigo é SQLite, não restauração de cópia do Neon. O domínio atual e os novos fluxos são testados também em PostgreSQL 17 isolado. Nenhum backup de produção é gerado neste ambiente, que não tem credenciais do banco/provedor.

## Arquivos desta revisão

- `laboratorio/app.js`: seções, seleção, roteiro e correção do pedido de arquivamento.
- `laboratorio/lab.css`: navegação responsiva das áreas e foco acessível.
- `laboratorio/index.html`: marcador público `research-panel-1` da entrega.
- `server/research.cjs`: somente o metadado autorizado `configurationFrozen` nesta revisão.
- `tests/lab-browser.cjs`: navegação, teclado, sete larguras e regressão de arquivamento.
- `tests/upgrade-release.cjs` e `package.json`: ensaio de atualização da versão antiga.
- `.github/workflows/verify-public-laboratory.yml`: conferência pública da versão do painel, arquivos e proteção sem autenticação. Não realiza operações de usuários.

As etapas anteriores da mesma entrega estão descritas em ACOMPANHAMENTO_DAS_JORNADAS_EXPERIMENTAIS.md, PARES_CONTROLADOS_DE_PAUSA.md e REGISTRO_MINIMO_DA_PAUSA.md. O Relatório-Mestre da raiz permanece principal; o relatório histórico em Documentação não foi sobrescrito.

## Limitações

Testes funcionais não demonstram eficácia contra golpes. Não há randomização, estudo com pessoas ou controle completo de efeitos de ordem. Sinais do navegador não comprovam leitura. Publicação externa pode confirmar versão/saúde/proteções, mas não substitui aceitação autenticada do titular; nenhuma senha ou conta real é usada pelo agente.

## Resultados executados antes do envio

- `npm test`: **182 aprovados**, sem falhas ou ignorados.
- PostgreSQL 17 local: **45 aprovados**; schemas isolados e contêiner temporário removidos após os testes.
- `npm run test:browser`: aprovado em Chromium com **SQLite e PostgreSQL**, incluindo as três áreas nas sete larguras, teclado, par, sinais, falha simulada de registro sem impedir Pix, arquivamento e exportações.
- `npm run test:access`: aprovado para cadastro, convites sucessivos e recuperação administrativa com nova senha.
- `npm run test:upgrade`: **um ensaio aprovado** contra banco gerado pela versão anterior real, inclusive metadados de configuração congelada.
- Sintaxe dos arquivos alterados, script do workflow e `git diff --check`: aprovados.

A verificação extra `npm run test:legacy` **não passou**: parou na primeira suíte, balance, ao clicar no botão de olho da demonstração estática. Diagnóstico em Chromium: botão com largura 0, runtime Tailwind local presente e sem erros JS. Font Awesome e fontes da demonstração dependem de CDNs; os pedidos HTTPS foram recusados pelo proxy com HTTP 403. A página da demonstração, CSS e seus módulos financeiros estão idênticos ao commit publicado anterior. Não se alteraram testes para simular clique via JavaScript nem se classificou essa suíte como aprovada. As oito suítes seguintes do runner não foram executadas, pois ele interrompe na primeira falha. O laboratório persistente usa seus próprios controles e passou nos testes acima. Disponibilizar localmente os recursos visuais externos da demonstração é recomendação futura, separada desta entrega.

Não foram executados testes com contas reais ou estudo com pessoas, dispositivos físicos ou outros navegadores. O ensaio de atualização não é backup de produção. A checagem pública posterior não realizará operações autenticadas.

## Publicação confirmada

Código enviado no commit `01f40e1349991419c53dc70481d3cfc170865c74` à branch `laboratorio-multiusuario`. A execução pública [42142388039](https://github.com/pauloalbertoofc-hue/Justec-Bank/actions/runs/42142388039), job `127645608868`, concluiu **Success**, incluindo **Published entrypoint research-panel-ready**. O GitHub registra conclusão em `2026-11-06T01:14:15Z`.

Foram conferidos o marcador público `research-panel-1`, scripts e CSS do novo painel, recuperação/convites preservados, saúde PostgreSQL, entrada por login, CSP e recusa de acesso sem autenticação nas rotas de pares e exposição. A evidência foi lida pela página pública do GitHub, pois a API e o acesso direto ao Render neste ambiente são limitados pelo proxy. O workflow consulta o endereço real do Render, sem credenciais ou operações de usuários.

Site: https://justec-laboratorio.onrender.com/ . Entrar com o acesso existente e abrir **Administração → Pesquisa → Configuração / Execução / Resultados**. main permaneceu em `837cb414ad27a149c9e0c57004f75af340ba9aec`, preservando a versão anterior da Vercel. Contas, senhas e dados de produção não foram modificados pelo agente. A coleta permanece desativada por padrão e em configurações antigas.

O ensaio público não inclui uso autenticado de contas reais nem valida eficácia. Permanecem as limitações de testes estáticos/CDNs descritas acima. Atualizações documentais posteriores não modificam o código verificado.
