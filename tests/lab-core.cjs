const test = require("node:test");
const assert = require("node:assert/strict");
const { Worker } = require("node:worker_threads");
const { fixture, draft, evaluated, PASSWORD } = require("./lab-fixture.cjs");
const { openDatabase } = require("../server/db.cjs");
const { Lab } = require("../server/lab.cjs");
const { examples } = require("../server/research.cjs");
const security = require("../server/security.cjs");
const isError = (status, code) => (e) =>
  e.status === status && (!code || e.code === code);
test("Persistência de sessão, conta, chave e livro-razão após reabrir o arquivo", async (t) => {
  const f = await fixture(t, { file: true });
  const d = evaluated(f);
  const tx = f.lab.authorize(
    f.alice,
    d.id,
    { demoCode: "0000" },
    "persist-001",
  );
  f.db.close();
  const another = openDatabase(f.filename);
  try {
    const l = new Lab(another);
    assert.equal(l.account(f.alice, f.a.id).balanceCents, 175000);
    assert.equal(l.account(f.bob, f.b.id).balanceCents, 125000);
    assert.equal(l.receipt(f.alice, tx.id).id, tx.id);
    assert.equal(l.sessionList(f.alice).length, 1);
    assert.equal(
      l.lookup(f.alice, f.sessionId, f.b.keys[0].value).accountId,
      f.b.id,
    );
  } finally {
    another.close();
  }
});
test("Papéis não são aceitos no cadastro nem contas privadas de outros titulares", async (t) => {
  const f = await fixture(t);
  await assert.rejects(
    () =>
      security.register(f.db, {
        alias: "forged-role",
        password: PASSWORD,
        consent: true,
        globalRole: "admin",
      }),
    isError(400),
  );
  assert.throws(
    () => f.lab.createSession(f.alice, { name: "Escalação" }),
    isError(403),
  );
  assert.throws(() => f.lab.account(f.alice, f.b.id), isError(403));
  assert.throws(() => f.lab.statement(f.alice, f.b.id), isError(403));
  assert.throws(() => f.lab.overview(f.alice, f.sessionId), isError(403));
  assert.throws(() => f.lab.session(f.outsider, f.sessionId), isError(403));
  assert.throws(
    () =>
      f.lab.createDraft(f.bob, f.sessionId, {
        sourceId: f.a.id,
        key: f.b.keys[0].value,
        amountCents: 1,
      }),
    isError(403),
  );
});
test("Convites de uso único, papéis por sessão e preservação do último administrador", async (t) => {
  const f = await fixture(t);
  const invite = f.lab.invite(f.admin, f.sessionId, { role: "researcher" });
  f.lab.join(f.outsider, { code: invite.code });
  assert.equal(f.lab.session(f.outsider, f.sessionId).role, "researcher");
  assert.throws(() => f.lab.join(f.bob, { code: invite.code }), isError(400));
  assert.throws(
    () => f.lab.invite(f.outsider, f.sessionId, { role: "admin" }),
    isError(403),
  );
  assert.throws(
    () =>
      f.lab.setRole(f.admin, f.sessionId, f.admin.id, { role: "participant" }),
    isError(409),
  );
  assert.throws(
    () =>
      f.lab.allocate(f.outsider, f.a.id, {
        amountCents: 1,
        reason: "Teste de permissão",
      }),
    isError(403),
  );
});
test("Chaves fictícias geradas, únicas por sessão, rotação e resolução sem saldo de terceiros", async (t) => {
  const f = await fixture(t);
  const key = f.lab.lookup(f.alice, f.sessionId, f.b.keys[0].value);
  assert.equal("balanceCents" in key, false);
  assert.match(key.key, /@pix\.justec\.invalid$/);
  assert.throws(
    () => f.lab.lookup(f.alice, f.sessionId, "pessoa@real.com"),
    isError(404),
  );
  assert.throws(() =>
    f.db
      .prepare("INSERT INTO pix_keys VALUES(?,?,?,?,?,?,?)")
      .run(
        security.id(),
        f.sessionId,
        f.a.id,
        f.b.keys[0].value,
        1,
        1,
        f.clock(),
      ),
  );
  const d = evaluated(f);
  f.lab.changeKey(f.bob, f.b.keys[0].id);
  assert.throws(
    () => f.lab.authorize(f.alice, d.id, { demoCode: "0000" }, "rotation-001"),
    isError(409, "RECIPIENT_CHANGED"),
  );
  assert.equal(f.lab.balance(f.a.id), 200000);
  assert.equal(f.lab.balance(f.b.id), 100000);
});
test("Débito e crédito atômicos conservam soma e compartilham o comprovante nos dois extratos", async (t) => {
  const f = await fixture(t),
    d = evaluated(f);
  const r = f.lab.authorize(
    f.alice,
    d.id,
    { demoCode: "0000" },
    "transfer-001",
  );
  assert.equal(f.lab.balance(f.a.id), 175000);
  assert.equal(f.lab.balance(f.b.id), 125000);
  assert.equal(r.entries.length, 2);
  assert.equal(
    r.entries.reduce((n, e) => n + e.deltaCents, 0),
    0,
  );
  assert.equal(f.lab.statement(f.alice, f.a.id).entries[0].transferId, r.id);
  assert.equal(f.lab.statement(f.bob, f.b.id).entries[0].transferId, r.id);
  assert.equal(
    f.lab.statement(f.alice, f.a.id).entries[0].balanceAfterCents,
    175000,
  );
  assert.equal(f.lab.receipt(f.bob, r.id).id, r.id);
  assert.match(r.disclaimer, /SEM VALOR FINANCEIRO/);
});
test("NaN, infinitos, strings, frações, zero e valores negativos são rejeitados sem mutação", async (t) => {
  const f = await fixture(t);
  const before = f.db.prepare("SELECT COUNT(*) n FROM transfers").get().n;
  const drafts = f.db.prepare("SELECT COUNT(*) n FROM drafts").get().n;
  for (const amount of [NaN, Infinity, "100", 0, -1, 1.5, null, 1e20])
    assert.throws(() => draft(f, amount), isError(400));
  assert.throws(() => draft(f, 200001), isError(409));
  assert.throws(
    () =>
      f.lab.createAccount(f.alice, f.sessionId, {
        name: "Injeção de saldo",
        initialCents: 999999,
      }),
    isError(400),
  );
  assert.equal(f.lab.balance(f.a.id), 200000);
  assert.equal(
    f.db.prepare("SELECT COUNT(*) n FROM transfers").get().n,
    before,
  );
  assert.equal(f.db.prepare("SELECT COUNT(*) n FROM drafts").get().n, drafts);
});
test("Saldo insuficiente e transferência à própria conta não criam lançamentos", async (t) => {
  const f = await fixture(t);
  assert.throws(() => draft(f, 250000), isError(409));
  assert.throws(
    () =>
      f.lab.createDraft(f.alice, f.sessionId, {
        sourceId: f.a.id,
        key: f.a.keys[0].value,
        amountCents: 1,
      }),
    isError(400),
  );
  assert.equal(f.lab.balance(f.a.id), 200000);
});
test("Isolamento de sessões é aplicado por autorização, resolução e foreign keys", async (t) => {
  const f = await fixture(t),
    other = f.lab.createSession(f.admin, { name: "Outra sessão" });
  f.lab.join(f.alice, {
    code: f.lab.invite(f.admin, other.id, { role: "participant" }).code,
  });
  const c = f.lab.createAccount(f.alice, other.id, { name: "Outro ambiente" });
  assert.throws(
    () =>
      f.lab.createDraft(f.alice, other.id, {
        sourceId: f.a.id,
        key: c.keys[0].value,
        amountCents: 1,
      }),
    isError(403),
  );
  assert.throws(
    () =>
      f.lab.createDraft(f.alice, f.sessionId, {
        sourceId: f.a.id,
        key: c.keys[0].value,
        amountCents: 1,
      }),
    isError(404),
  );
  assert.throws(
    () => f.lab.lookup(f.outsider, other.id, c.keys[0].value),
    isError(403),
  );
  const sql = "INSERT INTO transfers VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
  assert.throws(() =>
    f.db
      .prepare(sql)
      .run(
        security.id(),
        f.sessionId,
        f.alice.id,
        f.a.id,
        c.id,
        1,
        "pix",
        "completed",
        null,
        "cross-session",
        "hash",
        null,
        "Inválido",
        f.clock(),
      ),
  );
});
test("Idempotência retorna a mesma operação e rejeita chave reutilizada em outro rascunho", async (t) => {
  const f = await fixture(t),
    d = evaluated(f);
  const first = f.lab.authorize(
    f.alice,
    d.id,
    { demoCode: "0000" },
    "idem-0000001",
  );
  const second = f.lab.authorize(
    f.alice,
    d.id,
    { demoCode: "0000" },
    "idem-0000001",
  );
  assert.equal(first.id, second.id);
  assert.equal(f.lab.balance(f.a.id), 175000);
  const other = evaluated(f, 1000);
  assert.throws(
    () =>
      f.lab.authorize(f.alice, other.id, { demoCode: "0000" }, "idem-0000001"),
    isError(409, "IDEMPOTENCY_CONFLICT"),
  );
  assert.equal(
    f.db.prepare("SELECT COUNT(*) n FROM transfers WHERE kind='pix'").get().n,
    1,
  );
});
test("Concorrência real em dois workers/conexões SQLite impede saldo negativo", async (t) => {
  const f = await fixture(t, { file: true });
  const one = evaluated(f, 150000),
    two = evaluated(f, 150000);
  const login = await security.login(
    f.db,
    { alias: f.alice.alias, password: PASSWORD },
    f.clock(),
  );
  const code = `const {parentPort,workerData:w}=require('node:worker_threads');const {openDatabase}=require(w.root+'/server/db.cjs');const {Lab}=require(w.root+'/server/lab.cjs');const {authenticate}=require(w.root+'/server/security.cjs');const db=openDatabase(w.file),lab=new Lab(db,{now:()=>w.now});parentPort.postMessage({ready:true});parentPort.once('message',()=>{try{const u=authenticate(db,w.token,w.now);const tx=lab.authorize(u,w.draft,{demoCode:'0000'},w.idem);parentPort.postMessage({success:true,id:tx.id});}catch(e){parentPort.postMessage({success:false,code:e.code,status:e.status});}finally{db.close();}});`;
  const workers = [one, two].map(
    (d, i) =>
      new Worker(code, {
        eval: true,
        workerData: {
          root: require("node:path").resolve(__dirname, ".."),
          file: f.filename,
          now: f.clock(),
          token: login.secret,
          draft: d.id,
          idem: "parallel-" + i,
        },
      }),
  );
  const ready = workers.map(
    (w) =>
      new Promise((resolve, reject) => {
        w.once("message", resolve);
        w.once("error", reject);
      }),
  );
  await Promise.all(ready);
  const results = workers.map(
    (w) =>
      new Promise((resolve, reject) => {
        w.once("message", resolve);
        w.once("error", reject);
      }),
  );
  for (const w of workers) w.postMessage("go");
  const rows = await Promise.all(results);
  assert.equal(rows.filter((r) => r.success).length, 1, JSON.stringify(rows));
  assert.equal(f.lab.balance(f.a.id), 50000);
  assert.equal(f.lab.balance(f.b.id), 250000);
  assert.equal(
    f.db.prepare("SELECT COUNT(*) n FROM transfers WHERE kind='pix'").get().n,
    1,
  );
  await Promise.all(workers.map((w) => w.terminate()));
});
test("Pausa é exigida no servidor, não avança automaticamente e código errado não debita", async (t) => {
  const f = await fixture(t, { pauseMs: 5000 });
  const d = evaluated(f);
  assert.equal(d.status, "pause");
  assert.throws(
    () => f.lab.authorize(f.alice, d.id, { demoCode: "0000" }, "pause-0001"),
    isError(409, "PAUSE"),
  );
  f.advance(5000);
  assert.equal(f.lab.draft(f.alice, d.id).status, "pause");
  assert.throws(
    () => f.lab.authorize(f.alice, d.id, { demoCode: "9999" }, "pause-0001"),
    isError(400, "DEMO_CODE"),
  );
  assert.equal(f.lab.balance(f.a.id), 200000);
  f.lab.authorize(f.alice, d.id, { demoCode: "0000" }, "pause-0001");
  assert.equal(f.lab.balance(f.a.id), 175000);
});
test("Alteração da política, saldo e limite é revalidada na autorização", async (t) => {
  const f = await fixture(t),
    d = evaluated(f);
  f.lab.updateSession(f.admin, f.sessionId, {
    config: { pauseMs: 0, initialCents: 100000, mode: "education" },
  });
  assert.throws(
    () => f.lab.authorize(f.alice, d.id, { demoCode: "0000" }, "policy-001"),
    isError(409, "POLICY_CHANGED"),
  );
  const next = evaluated(f, 150000);
  f.lab.configureAccount(f.admin, f.a.id, {
    limitCents: 10000,
    reason: "Limite experimental reconfigurado.",
  });
  assert.throws(
    () => f.lab.authorize(f.alice, next.id, { demoCode: "0000" }, "limit-0001"),
    isError(409, "LIMIT"),
  );
  assert.equal(f.lab.balance(f.a.id), 200000);
});
test("Interrupção contextual não altera saldo nem restringe permanentemente o destinatário", async (t) => {
  const f = await fixture(t),
    d = draft(f, 25000, { requestContext: true });
  let r = f.lab.evaluateDraft(f.alice, d.id, {});
  assert.equal(r.status, "verification");
  r = f.lab.evaluateDraft(f.alice, d.id, {
    answers: { identity: "no", urgency: "yes", advance: "yes", ignore: "no" },
    acknowledged: true,
  });
  assert.equal(r.status, "blocked");
  assert.equal(f.lab.balance(f.a.id), 200000);
  assert.equal(f.lab.balance(f.b.id), 100000);
  assert.equal(f.lab.account(f.bob, f.b.id).status, "active");
  assert.throws(
    () => f.lab.authorize(f.alice, d.id, { demoCode: "0000" }, "blocked-001"),
    isError(409),
  );
  assert.equal(
    f.lab.statement(f.alice, f.a.id, { status: "blocked" }).attempts.length,
    1,
  );
});
test("Não sei permanece inconclusivo e cancelamento/revisão invalida autorização anterior", async (t) => {
  const f = await fixture(t),
    d = draft(f, 25000, { requestContext: true });
  let r = f.lab.evaluateDraft(f.alice, d.id, {
    answers: {
      identity: "unknown",
      urgency: "no",
      advance: "no",
      ignore: "no",
    },
    acknowledged: true,
  });
  assert.equal(r.status, "verification");
  assert.equal(r.evaluation.decision.action, "INCONCLUSIVE");
  f.lab.cancelDraft(f.alice, d.id, {
    reason: "Verificar por canal independente",
  });
  assert.throws(
    () => f.lab.authorize(f.alice, d.id, { demoCode: "0000" }, "cancel-001"),
    isError(409),
  );
  const revised = f.lab.reviseDraft(f.alice, d.id);
  assert.notEqual(revised.id, d.id);
  assert.equal(revised.status, "review");
  assert.equal(f.lab.balance(f.a.id), 200000);
});
test("Restrição ativa e revogação da chave durante a pausa impedem envio", async (t) => {
  const f = await fixture(t),
    d = evaluated(f);
  f.lab.configureAccount(f.admin, f.b.id, {
    status: "restricted",
    reason: "Restrição operacional fundamentada de teste.",
  });
  const result = f.lab.authorize(
    f.alice,
    d.id,
    { demoCode: "0000" },
    "restriction-001",
  );
  assert.equal(result.interrupted, true);
  assert.equal(result.draft.status, "blocked");
  assert.equal(f.lab.balance(f.a.id), 200000);
});
test("Falha entre débito e crédito faz rollback integral e não produz sucesso", async (t) => {
  const f = await fixture(t),
    d = evaluated(f);
  f.db.exec(
    `CREATE TRIGGER simulated_storage_error BEFORE INSERT ON ledger_entries WHEN NEW.account_id='${f.b.id}' AND NEW.delta_cents=25000 BEGIN SELECT RAISE(ABORT,'test write failure'); END;`,
  );
  const transfers = f.db.prepare("SELECT COUNT(*) n FROM transfers").get().n;
  assert.throws(() =>
    f.lab.authorize(f.alice, d.id, { demoCode: "0000" }, "failure-001"),
  );
  assert.equal(f.lab.balance(f.a.id), 200000);
  assert.equal(f.lab.balance(f.b.id), 100000);
  assert.equal(
    f.db.prepare("SELECT COUNT(*) n FROM transfers").get().n,
    transfers,
  );
  assert.equal(f.lab.draft(f.alice, d.id).status, "pause");
  f.db.exec("DROP TRIGGER simulated_storage_error");
  f.lab.authorize(f.alice, d.id, { demoCode: "0000" }, "failure-001");
  assert.equal(f.lab.balance(f.a.id), 175000);
});
test("Revisão de falso positivo preserva a decisão original e registra liberação separada", async (t) => {
  const f = await fixture(t),
    d = draft(f, 25000, { requestContext: true });
  const blocked = f.lab.evaluateDraft(f.alice, d.id, {
    answers: { identity: "no", urgency: "yes", advance: "yes", ignore: "no" },
    acknowledged: true,
  });
  const original = JSON.stringify(blocked.evaluation);
  const review = f.lab.requestReview(f.alice, d.id, {
    reason: "Operação legítima do cenário; revisar indícios contextuais.",
  });
  assert.throws(
    () =>
      f.lab.resolveReview(f.alice, review.id, {
        decision: "release",
        reason: "Tentativa indevida de resolver",
      }),
    isError(403),
  );
  f.lab.resolveReview(f.admin, review.id, {
    decision: "release",
    reason: "Revisão manual do cenário documentada e fundamentada.",
  });
  const followup = f.lab.followup(f.alice, review.id);
  assert.equal(f.lab.followup(f.alice, review.id).id, followup.id);
  const reviewed = f.lab.evaluateDraft(f.alice, followup.id, {});
  assert.equal(reviewed.evaluation.decision.manualClearance, true);
  f.lab.authorize(f.alice, followup.id, { demoCode: "0000" }, "review-001");
  assert.equal(JSON.stringify(f.lab.draft(f.alice, d.id).evaluation), original);
  assert.equal(f.lab.draft(f.alice, d.id).status, "blocked");
});
test("Livro-razão, avaliações e auditoria não admitem atualização/exclusão", async (t) => {
  const f = await fixture(t),
    d = evaluated(f);
  const tx = f.lab.authorize(
    f.alice,
    d.id,
    { demoCode: "0000" },
    "immutable-001",
  );
  for (const table of [
    "ledger_entries",
    "transfers",
    "evaluations",
    "audit_events",
  ]) {
    assert.throws(() => f.db.exec(`UPDATE ${table} SET id='altered'`));
    assert.throws(() => f.db.exec(`DELETE FROM ${table}`));
  }
  assert.equal(f.lab.receipt(f.alice, tx.id).id, tx.id);
  assert(
    f.lab
      .overview(f.admin, f.sessionId)
      .audit.some((e) => e.action === "draft.authorized"),
  );
});
test("Rótulos secretos não mudam a decisão; mede VP/FP/VN/FN e ausência de amostra", async (t) => {
  const f = await fixture(t);
  assert.equal(f.lab.metrics(f.admin, f.sessionId).groups.length, 0);
  const results = [];
  for (const example of examples()) {
    const scenario = f.lab.createScenario(f.admin, f.sessionId, example),
      run = f.lab.startRun(f.admin, f.sessionId, scenario.id, {
        condition: "integrated",
        pauseMs: 0,
      });
    const operation = f.lab
      .runs(f.admin, f.sessionId)
      .find((r) => r.id === run.id).operations[0];
    let d = f.lab.taskDraft(f.admin, operation.id);
    d = f.lab.evaluateDraft(f.admin, d.id, {
      answers: JSON.parse(operation.scripted_answers),
      acknowledged: true,
    });
    if (d.status === "pause")
      f.lab.authorize(
        f.admin,
        d.id,
        { demoCode: "0000" },
        "research-" + run.id,
      );
    results.push({
      label: operation.label,
      action: d.evaluation.decision.action,
    });
    assert.equal(JSON.stringify(d).includes('"label"'), false);
  }
  const metrics = f.lab.metrics(f.admin, f.sessionId);
  const sum = metrics.groups.reduce(
    (s, g) => ({
      TP: s.TP + g.TP,
      FP: s.FP + g.FP,
      TN: s.TN + g.TN,
      FN: s.FN + g.FN,
    }),
    { TP: 0, FP: 0, TN: 0, FN: 0 },
  );
  assert.deepEqual(sum, { TP: 1, FP: 1, TN: 1, FN: 1 });
  assert.equal(results[0].action, results[3].action);
  assert.equal(results[1].action, results[2].action);
  assert.throws(() => f.lab.metrics(f.alice, f.sessionId), isError(403));
});
test("Condições equivalentes, repetição e restauração preservam resultados e proprietários", async (t) => {
  const f = await fixture(t);
  const scenario = f.lab.createScenario(f.admin, f.sessionId, examples()[0]);
  const run = f.lab.startRun(f.admin, f.sessionId, scenario.id, {
    condition: "education",
    pauseMs: 0,
    owners: { ana: f.alice.id, robson: f.bob.id },
  });
  const repeat = f.lab.repeatRun(f.admin, run.id);
  assert.equal(run.baselineHash, repeat.baselineHash);
  assert.equal(f.lab.accounts(f.alice, run.sessionId).length, 1);
  assert.equal(f.lab.accounts(f.alice, repeat.sessionId).length, 1);
  assert.throws(
    () =>
      f.lab.updateSession(f.admin, run.sessionId, { config: { mode: "none" } }),
    isError(409),
  );
  const source = f.lab.accounts(f.alice, run.sessionId)[0],
    target = f.lab.accounts(f.bob, run.sessionId)[0];
  const d = f.lab.createDraft(f.alice, run.sessionId, {
    sourceId: source.id,
    key: target.keys[0].value,
    amountCents: 25000,
  });
  f.lab.evaluateDraft(f.alice, d.id, {});
  f.lab.authorize(f.alice, d.id, { demoCode: "0000" }, "run-payment");
  const snap = f.lab.snapshot(f.admin, run.sessionId, {
      name: "Base após operação",
    }),
    restored = f.lab.restore(f.admin, snap.id, {
      name: "Restauração controlada",
      archiveSource: true,
    });
  assert.equal(f.lab.balance(source.id), 175000);
  assert.equal(
    f.lab.account(f.alice, f.lab.accounts(f.alice, restored.id)[0].id)
      .balanceCents,
    175000,
  );
  assert.equal(f.lab.session(f.alice, run.sessionId).status, "archived");
  assert.throws(
    () =>
      f.lab.createAccount(f.alice, run.sessionId, { name: "Não deve criar" }),
    isError(409),
  );
  assert.equal(
    f.lab.accounts(f.alice, repeat.sessionId)[0].balanceCents,
    200000,
  );
  assert.equal(
    f.db
      .prepare("SELECT COUNT(*) n FROM account_observations WHERE session_id=?")
      .get(restored.id).n,
    1,
  );
});
test("Exportações e observações são restritas, versionadas e não contêm credenciais", async (t) => {
  const f = await fixture(t);
  const example = examples()[0];
  example.baseline.operations[0].id = "=1+1";
  const scenario = f.lab.createScenario(f.admin, f.sessionId, example),
    run = f.lab.startRun(f.admin, f.sessionId, scenario.id, {
      condition: "none",
    });
  const operation = f.lab.runs(f.admin, f.sessionId)[0].operations[0];
  let d = f.lab.taskDraft(f.admin, operation.id);
  d = f.lab.evaluateDraft(f.admin, d.id, {});
  f.lab.authorize(f.admin, d.id, { demoCode: "0000" }, "csv-test");
  f.lab.note(f.admin, f.sessionId, {
    note: "Observação acadêmica sem dados pessoais.",
  });
  const json = f.lab.exportResearch(f.admin, f.sessionId, "json"),
    csv = f.lab.exportResearch(f.admin, f.sessionId, "csv");
  assert.match(csv.body, /'=1\+1/);
  assert.equal(json.body.includes("password_hash"), false);
  assert.equal(json.body.includes(PASSWORD), false);
  assert.equal(JSON.parse(json.body).executions.length, 1);
  assert.throws(() => f.lab.exportResearch(f.alice, f.sessionId), isError(403));
});

test("Condição comportamental não usa perguntas contextuais e reconhece somente o alerta", async (t) => {
  const f = await fixture(t);
  const guard = require("../server/guard.cjs");
  const settings = guard.config({ mode: "behavior", pauseMs: 5000 });
  const input = {
    draft: { id: "observable", recipient: { id: "target" }, amount: 100 },
    transactions: [1, 2, 3].map(() => ({
      type: "pix-out",
      status: "completed",
      amount: -10,
      participant: { id: "target" },
    })),
    attempts: [],
    restricted: false,
    settings,
    collectedAt: new Date(f.clock()).toISOString(),
  };
  let result = guard.evaluate(input);
  assert.equal(result.decision.action, "NEEDS_VERIFICATION");
  assert.equal(result.needsVerification, true);
  assert.equal(result.contextualEnabled, false);
  assert.equal(result.pauseMs, 0);
  result = guard.evaluate({
    ...input,
    acknowledged: true,
    responses: {
      identity: "no",
      urgency: "yes",
      advance: "yes",
      ignore: "yes",
    },
  });
  assert.equal(result.needsVerification, false);
  assert.equal(result.decision.action, "NEEDS_VERIFICATION");
  assert.equal(result.evaluation.codes.includes("URGENCY"), false);
  const none = guard.evaluate({
    ...input,
    settings: guard.config({ mode: "none" }),
    responses: {
      identity: "no",
      urgency: "yes",
      advance: "yes",
      ignore: "yes",
    },
  });
  assert.equal(none.decision.action, "ALLOWED");
});
test("Autorreporte é opcional, limitado ao titular e imutável, sem medir eficácia", async (t) => {
  const f = await fixture(t),
    d = evaluated(f);
  assert.throws(
    () =>
      f.lab.feedback(f.alice, d.id, {
        understanding: "yes",
        intention: "continue",
      }),
    isError(409),
  );
  f.lab.authorize(f.alice, d.id, { demoCode: "0000" }, "feedback-001");
  assert.throws(
    () =>
      f.lab.feedback(f.bob, d.id, {
        understanding: "yes",
        intention: "continue",
      }),
    isError(403),
  );
  f.lab.feedback(f.alice, d.id, {
    understanding: "yes",
    intention: "continue",
  });
  assert.throws(
    () =>
      f.lab.feedback(f.alice, d.id, {
        understanding: "no",
        intention: "reconsider",
      }),
    isError(409),
  );
  assert.equal(
    f.lab.overview(f.admin, f.sessionId).participantFeedback[0].understanding,
    "yes",
  );
  assert.throws(() => f.db.exec("DELETE FROM participant_feedback"));
});

test("Reconsideração com nova conferência mantém o vínculo e o resultado do experimento", async (t) => {
  const f = await fixture(t);
  const scenario = f.lab.createScenario(f.admin, f.sessionId, examples()[0]);
  const run = f.lab.startRun(f.admin, f.sessionId, scenario.id, {
    condition: "education",
    pauseMs: 0,
  });
  const op = f.lab.runs(f.admin, f.sessionId).find((r) => r.id === run.id)
    .operations[0];
  const original = f.lab.taskDraft(f.admin, op.id);
  f.lab.evaluateDraft(f.admin, original.id, {});
  f.lab.cancelDraft(f.admin, original.id, {
    reason: "Conferir antes de autorizar.",
  });
  const revision = f.lab.reviseDraft(f.admin, original.id);
  assert.equal(f.lab.reviseDraft(f.admin, original.id).id, revision.id);
  assert.equal(revision.revisionOf, original.id);
  f.lab.evaluateDraft(f.admin, revision.id, {});
  f.advance(1000);
  f.lab.authorize(f.admin, revision.id, { demoCode: "0000" }, "revision-trial");
  const metric = f.lab.metrics(f.admin, f.sessionId).groups[0];
  assert.equal(metric.TN, 1);
  assert.equal(metric.reconsidered, 1);
  assert.equal(metric.n, 1);
  assert.equal(f.lab.draft(f.admin, original.id).status, "cancelled");
});

test("Repetição conserva a política original mesmo após mudar a sessão principal", async (t) => {
  const f = await fixture(t);
  const scenario = f.lab.createScenario(f.admin, f.sessionId, examples()[0]);
  const first = f.lab.startRun(f.admin, f.sessionId, scenario.id, {
    condition: "integrated",
    pauseMs: 100,
  });
  const original = f.db
    .prepare("SELECT config_snapshot FROM runs WHERE id=?")
    .get(first.id).config_snapshot;
  f.lab.updateSession(f.admin, f.sessionId, {
    config: { pauseMs: 200, rules: { newRecipient: 21, high: 70 } },
  });
  assert.equal(f.lab.session(f.admin, f.sessionId).config.initialCents, 100000);
  const repeated = f.lab.repeatRun(f.admin, first.id);
  assert.equal(
    f.db.prepare("SELECT config_snapshot FROM runs WHERE id=?").get(repeated.id)
      .config_snapshot,
    original,
  );
  assert.equal(repeated.baselineHash, first.baselineHash);
});

test("Perfis públicos adicionais podem ser configurados sem se tornarem rótulos de fraude", async (t) => {
  const f = await fixture(t);
  const profiles = [
    "person",
    "business",
    "new",
    "established",
    "merchant-online",
  ];
  f.lab.updateSession(f.admin, f.sessionId, { config: { profiles } });
  const account = f.lab.createAccount(f.alice, f.sessionId, {
    name: "Loja virtual fictícia",
    profile: "merchant-online",
  });
  assert.equal(account.profile, "merchant-online");
  assert.throws(
    () =>
      f.lab.createAccount(f.alice, f.sessionId, {
        name: "Sem permissão",
        profile: "secret-fraud-label",
      }),
    isError(400),
  );
  assert.throws(
    () =>
      f.lab.updateSession(f.admin, f.sessionId, {
        config: { profiles: ["merchant-online"] },
      }),
    isError(409, "PROFILE_IN_USE"),
  );
  const d = evaluated(f);
  assert.equal(
    d.evaluation.evaluation.codes.includes("merchant-online"),
    false,
  );
  assert.equal(d.evaluation.decision.action, "ALLOWED");
});

test("Respostas previstas no roteiro não ativam o Guard antes de serem fornecidas", async (t) => {
  const f = await fixture(t);
  for (const example of examples()) {
    const scenario = f.lab.createScenario(f.admin, f.sessionId, example),
      run = f.lab.startRun(f.admin, f.sessionId, scenario.id, {
        condition: "integrated",
        pauseMs: 0,
      });
    const op = f.lab.runs(f.admin, f.sessionId).find((r) => r.id === run.id)
        .operations[0],
      d = f.lab.taskDraft(f.admin, op.id);
    const observed = f.lab.evaluateDraft(f.admin, d.id, {});
    assert.equal(observed.status, "pause");
    assert.equal(observed.evaluation.decision.action, "ALLOWED");
    assert.equal(
      observed.evaluation.evaluation.codes.includes("URGENCY"),
      false,
    );
  }
});
