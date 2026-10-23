# JUSTEC — PostgreSQL e preparação do Render gratuito

Adendo técnico de 22/10/2026. Sucede a entrega inicial SQLite e os dois documentos de apresentação daquela etapa; não apaga seu histórico. O usuário autorizou Render gratuito + PostgreSQL gratuito. No início não tinha projeto PostgreSQL; durante a implementação informou ter criado a conta, ainda sem identificar provedor e conexão. Android permanece fora desta etapa.

## Resultado implementado

A mesma aplicação passa a operar com SQLite local ou PostgreSQL externo. `DATABASE_URL` seleciona PostgreSQL; a ausência da variável preserva SQLite local, mas é recusada no Render gratuito para evitar dados efêmeros. Não houve alteração na interface, no motor original, pesos padrão ou contrato de centavos. Não existe importação automática de dados SQLite para o banco novo.

O blueprint raiz usa Render Free, sem disco, sem recurso pago de banco Render e com deploy manual. O candidato recomendado é Neon Free, conexão direta, próximo da região do Render. Supabase é alternativa a validar quanto a conectividade/pooler. Não foi criada conta de provedor, serviço externo ou cobrança. Cotas e regras comerciais não foram verificadas diretamente nos painéis; selecionar Free e não habilitar recursos pagos.

## Arquitetura e escolhas

- `server/postgres.cjs`: `pg` 8.16.3, pool de quatro conexões, TLS com validação do certificado, consultas parametrizadas, tradução limitada do dialeto comum e migrações próprias.
- `server/flow.cjs`: executor nativo de generators. O mesmo domínio mantém valores/exceções síncronos com SQLite e aguarda promessas com PostgreSQL. Não há cópia paralela das regras financeiras, sync RPC, bloqueio de rede via Atomics ou framework adicional. `collect` aguarda resultados de callbacks de listas sem devolver promessas na API.
- `server/lab.cjs`, `research.cjs`, `security.cjs`: consultas são aguardadas; regras permanecem únicas. Novos consumidores devem usar `await`, válido com ambos os modos. HTTP foi ajustado para aguardar operações e auditoria.
- `AsyncLocalStorage` vincula todas as consultas de uma transação à mesma conexão PostgreSQL. BEGIN, lock, validação, débito, crédito, auditoria e COMMIT/ROLLBACK ocorrem nela; não se alternam consultas financeiras entre conexões do pool.
- Advisory lock transacional serializa mutações entre processos em READ COMMITTED. Isso evita que duas autorizações gastem o mesmo saldo; o snapshot se renova após aguardar. É uma escolha conservadora para laboratório pequeno, não arquitetura financeira de alta escala.
- O extrato também é lido em transação para impedir mistura entre linhas antigas e saldo atualizado por envio concorrente. A ordem estável usa identity no PostgreSQL em vez de rowid SQLite.
- `migrations-postgres/`: BIGINT com conversão segura para inteiros JavaScript, checks JSON, unicidade de alias sem distinção de caixa, FKs e triggers PL/pgSQL de imutabilidade. Migrações SQLite anteriores não foram reescritas.
- `bootstrap-admin.cjs`: primeiro administrador pode ser criado no início mediante segredo explícito, já que o Render gratuito pode não oferecer Shell. Criação concorrente resulta em um único administrador; segredo posterior não redefine senha existente.
- `index.cjs`: seleciona armazenamento, migra antes de escutar, usa origem HTTPS Render e não imprime conexão/senhas. `health` consulta o banco e informa driver/versão sem segredo.
- `backup.cjs`: continua sendo ferramenta SQLite; recusa funcionar como falso backup PostgreSQL. Dump/recuperação do provedor são procedimentos separados a ensaiar.

A exceção de PostgreSQL sem TLS é limitada a host local e ativação explícita para testes. URLs remotas com sslmode que desabilitaria validação não fazem o driver aceitar certificado inválido. Conexão TLS real ao Neon/Render não foi testada, pois não existe banco provisionado.

## Compatibilidade e correção adicional

Preservados `js/state.js`, `js/risk.js`, `js/pix.js`, transações e módulos experimentais originais. main e versão estática não são alteradas. A proteção vercel.json continua desativando deploy Git da branch laboratório na Vercel.

A regressão revelou uma disputa preexistente na inicialização SQLite: PRAGMA journal_mode podia emitir SQLITE_BUSY sem respeitar busy_timeout. Acrescentado retry limitado a dez segundos apenas nessa inicialização, sem repetir operações financeiras. Após corrigir, o teste de duas migrações concorrentes passou em cinco execuções adicionais.

## Testes executados

- `npm test`: 153 aprovados, zero falhas/ignorados. Inclui os 147 anteriores, cinco testes do executor/TLS/tradução e um teste contra fallback efêmero no Render.
- `npm run test:postgres`: 17 aprovados com PostgreSQL 17 real em container efêmero isolado, zero falhas/ignorados. Schemas aleatórios de teste são removidos ao terminar.
- PostgreSQL cobriu débito/crédito, idempotência, valores inválidos sem alteração, autenticação e caixa de alias, propriedade, pools concorrentes, rollback entre partidas, pausa, chave alterada, isolamento, snapshots/repetição, VP/FP/VN/FN, exportação, imutabilidade, reconexão, HTTP/CSRF, revisão, migração concorrente, bootstrap concorrente, processo de serviço reiniciado e extrato consistente durante envio concorrente.
- `npm run test:browser`: aprovado com SQLite e repetido com `JUSTEC_TEST_POSTGRES_URL` para PostgreSQL. Mesma jornada com login real, múltiplas contas, débito/crédito, recarga, revisão/exportação e educação nas sete larguras 320/375/390/768/1024/1366/1920.
- `npm run test:legacy`: nove suítes originais aprovadas após adaptação HTTP, incluindo navegação, saldo, extrato, Pix, layouts, modais, conteúdo e atalhos.
- `npm ci --omit=dev`: instalação isolada validou o lock de produção, driver presente e Playwright ausente.

Ensaios intermediários falharam e foram corrigidos: uso de rowid incompatível no extrato PostgreSQL; expectativas de nomes de campos/códigos em novos testes; disputa SQLite descrita acima. Esses ensaios não são apresentados como aprovados. Testes finais são os resultados listados. Certificado TLS foi testado quanto à configuração, não com certificado de provedor externo.

## Pendência para publicação efetiva

O trabalho de código não cria acesso às contas de hospedagem. O titular precisa criar projeto Free no Neon, copiar a conexão diretamente para `DATABASE_URL` no painel Render e definir senha inicial privada. O guia `deploy/README.md` traz campos, sequência e validação. A conta Render pode estar associada ao GitHub sem oferecer credencial de controle ao agente nesta sessão.

Somente após deploy, health PostgreSQL, login e teste de persistência em URL pública registrar a publicação como concluída. Não se apresenta teste local ou push GitHub como deploy. Não fornecer segredos pelo chat. A criação externa, quotas, hibernação, recuperação por dump e comportamento sob carga no provedor continuam pendentes.

Os documentos Word/PDF anteriores relatam a entrega inicial e permanecem como registro; este adendo e o guia representam o suporte PostgreSQL acrescentado depois. Não houve avaliação científica de eficácia ou integração financeira real.
