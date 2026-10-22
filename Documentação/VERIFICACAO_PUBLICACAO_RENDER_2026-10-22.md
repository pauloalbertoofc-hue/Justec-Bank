# Verificação pública do JUSTEC no Render — 22/10/2026

URL informada pelo titular: https://justec-laboratorio.onrender.com/

Laboratório persistente: https://justec-laboratorio.onrender.com/laboratorio/

## Evidência executada

O acesso direto deste ambiente foi recusado pelo proxy (HTTP CONNECT 403) e pelo Chromium (ERR_TUNNEL_CONNECTION_FAILED). Isso não foi interpretado como indisponibilidade do site. Criado teste público somente de leitura em `.github/workflows/verify-public-laboratory.yml`, executado em runner padrão GitHub Actions, sem credenciais, checkout ou dependências.

Execução final validada: https://github.com/pauloalbertoofc-hue/Justec-Bank/actions/runs/39870634272

Commit do teste: `11d8c0260d3226b9ec90845bf40551f2f04f0663`.

A API GitHub confirmou `status: completed`, `conclusion: success` e sucesso do passo `Check public deployment without credentials or data changes`, job `120143873899`. O script desse commit exige todas as condições abaixo antes de terminar com sucesso:

- GET `/api/health`: HTTP 200, `simulation: true`, `storage: postgres`, versão `justec-lab/1.1.0` e Cache-Control no-store. O endpoint executa SELECT 1 no banco antes da resposta.
- GET `/laboratorio/`: HTTP 200, formulários login/cadastro e bloco educativo presentes no HTML; CSP com script-src self e X-Frame-Options DENY.
- Scripts e folhas de estilo referenciados pelo laboratório: pelo menos quatro arquivos, da própria origem, todos HTTP 200.
- GET `/api/auth/me` e `/api/sessions` sem credenciais: HTTP 401.
- GET `/`: HTTP 200 com os elementos da Home e telas educativas preservados.

O download do log bruto foi bloqueado pelo domínio de armazenamento de logs na rede deste ambiente. A verificação utiliza o conteúdo versionado do teste e a conclusão de sucesso do run/job obtida pela API; não se afirma ter lido o console bruto. A primeira execução também concluiu com sucesso; a execução final é a referência, após exigir aceitação somente depois de todas as assertions de saúde.

## Alcance e limites

Publicação básica do serviço e conexão com PostgreSQL confirmadas por teste externo. Não houve cadastro de conta, login, envio de Pix, alteração de dados, exportação autenticada ou captura de navegador remoto. A autenticação exigida foi verificada apenas quanto à recusa sem credencial. O formulário aparecer no HTML não comprova renderização/uso integral em navegador.

Os testes locais anteriormente executados (153 gerais, 17 PostgreSQL, suítes de navegador e regressões) continuam sendo evidência separada. Não foram reapresentados como operações executadas em produção. O provedor Neon foi informado pelo titular; o endpoint confirma PostgreSQL, não plano comercial ou identidade do provedor. Cotas, cobrança e configuração dos painéis não foram auditadas.

Para completar aceitação remota: titular entra com credencial definida no bootstrap, cria sessão e convites de participantes sintéticos, confere débito/crédito, revisão, recarga e persistência após reinício do Render. Depois de confirmar login, remover JUSTEC_ADMIN_PASSWORD do painel, mantendo a conta já registrada. Não enviar senhas ao chat.

main permaneceu em `837cb414ad27a149c9e0c57004f75af340ba9aec`, preservando a versão anterior para Vercel. O novo teste foi acrescentado somente em laboratorio-multiusuario. Não foi alterado código de negócio nesta verificação.
