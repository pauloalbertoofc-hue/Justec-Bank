# JUSTEC — Acesso, convites e estudo da pausa preventiva

**Atualização da etapa seguinte:** a recuperação por código prévio foi implementada e está descrita em [RECUPERACAO_SEGURA_DE_ACESSO.md](RECUPERACAO_SEGURA_DE_ACESSO.md). As referências abaixo à ausência de recuperação descrevem o estado da primeira entrega. Sem código previamente gerado, o atendimento verificado continua necessário.

## Escopo desta entrega

Primeira melhoria incremental, preparada em branch separada `melhorias-acesso-convites`. Sem publicação automática. A versão estática e o núcleo financeiro não foram alterados. Nenhuma conta de produção foi consultada ou modificada.

## O que foi implementado

- Explicação de pseudônimo e de acesso individual na entrada.
- Ajuda “Esqueci meu acesso”: orienta consultar o gerenciador de senhas e procurar a equipe; informa expressamente que recuperação automática ainda não existe. Não solicita segredos nem promete redefinição.
- Cadastro preenche o pseudônimo no login, fecha o formulário de inscrição e orienta usar a própria senha. Nenhum login automático ou atribuição de papel global.
- Administração gera link além do código de convite já existente. O servidor continua criando convite de uso único, com prazo de 72 horas e papel validado.
- Link usa `/laboratorio/#convite=...`. O fragmento não é enviado no pedido HTTP nem no Referer. O aplicativo retira o fragmento da URL atual e mantém o código somente em memória. O link completo é um segredo de acesso ao ambiente: compartilhe apenas com a pessoa convidada. Ele pode aparecer no aplicativo de mensagens ou histórico de sincronização; fragmento não oferece sigilo absoluto.
- Ao entrar, o usuário vê o formulário com código preenchido e confirma explicitamente. Nenhum convite é consumido por abrir o link ou se cadastrar. Depois da aceitação, entra na Home do ambiente.
- A política de papéis não mudou: cadastro é participante global; o convite define participante, pesquisador ou administrador somente no ambiente. Administradores e pesquisadores continuam podendo alternar para a área autorizada.

## Limites e validação manual

O convite fica apenas em memória: recarregar a página antes de aceitar elimina o preenchimento. Reabra o link original ou cole o código. Convites expirados, usados e destinados a ambientes encerrados continuam sujeitos às verificações do servidor. Um membro já inscrito não é promovido por convite: um administrador deve alterar o papel pelo gerenciamento existente.

Para validar: gere um convite no painel Pesquisa; copie o link; abra em janela privada; crie um pseudônimo novo e senha exclusiva; entre e confira o código preenchido; aceite; confirme o ambiente e papel. Teste também que abrir o link sem confirmar não cria vínculo. Utilize somente dados fictícios.

## Próxima etapa proposta: recuperação segura de acesso

Não foi implementada redefinição nesta entrega. Antes de desenvolvê-la, definir como verificar a identidade de um usuário pseudônimo sem coletar dados reais desnecessários. Possíveis caminhos: códigos de recuperação fornecidos no cadastro e guardados pelo usuário, ou procedimento de convite supervisionado com verificação fora do sistema. Conhecer o pseudônimo não pode bastar para trocar a senha.

Requisitos futuros: token aleatório, hash no armazenamento, prazo curto, uso único, limite de tentativas, mensagens que não revelem a existência de contas, registro de auditoria sem segredos, revogação de sessões após redefinição e tratamento específico de administrador global. Alterar a variável de bootstrap do Render não redefine uma conta existente. Não criar endpoint público de recuperação administrativa sem verificação.

## Próxima etapa proposta: entrada por perfil

Manter uma entrada única. Após autenticação e seleção do ambiente, apresentar orientação contextual de participante, pesquisador ou administrador. O mesmo usuário pode ter papéis diferentes em ambientes distintos: nunca decidir autorização apenas pela interface ou por uma escolha no login. Validar a transição de modo com usuários antes de redirecionar automaticamente pesquisadores para o painel, preservando seu acesso ao banco simulado.

## Protocolo preliminar para avaliar a pausa

Pergunta: uma pausa educativa antes da autorização melhora a identificação de situações suspeitas sem prejudicar excessivamente operações legítimas?

Comparar condições com e sem pausa em transferências exclusivamente virtuais. Preparar cenários suspeitos e legítimos com sinais semelhantes, definir previamente o resultado esperado e manter essa informação oculta do participante. Contrabalançar a ordem ou randomizar a condição, evitando repetir o mesmo cenário conhecido. Não experimentar com dinheiro ou senhas bancárias reais.

Medidas: autorização de cenário suspeito; interrupção de cenário legítimo; compreensão do motivo; tempo de conclusão; abandono; confiança percebida; necessidade de ajuda. Diferenciar reconsideração voluntária e bloqueio pelo motor. Uma desistência sozinha não comprova eficácia. Registrar exposições e operações incompletas para não calcular métricas apenas entre quem terminou.

Fase inicial: teste de usabilidade supervisionado para corrigir instruções e acessibilidade, sem conclusões estatísticas de eficácia. Depois, planejar amostra, hipóteses, critérios de exclusão e análise antes da coleta comparativa; não inventar número de participantes nem resultados. Discutir consentimento, avaliação ética aplicável, retenção e exclusão de registros com a instituição. Não habilitar experimento automaticamente nesta entrega.

## Critérios para avançar

Acesso: pessoa consegue distinguir pseudônimo, senha de login e código fictício do Pix. Convites: pessoa entra no ambiente certo sem ajuda e sem ganhar privilégios fora dele. Recuperação: procedimento validado com responsável técnico e identidade verificável. Pesquisa: protocolo revisado, coleta minimizada e cenários equilibrados. Sem promessa de prevenção de fraude comprovada.

## Verificação desta entrega

Executados com sucesso: `npm test` (154 testes), `npm run test:access` (cadastro e convite completo, inclusive geração no painel administrativo), `npm run test:browser` (Chromium/SQLite nas sete larguras, com Pix e extrato), `node --check laboratorio/app.js` e `git diff --check`. Não executados PostgreSQL, produção autenticada, aparelhos físicos ou outros navegadores nesta etapa. Não houve publicação.
