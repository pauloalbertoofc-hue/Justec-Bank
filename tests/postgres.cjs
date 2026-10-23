const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const {
  fixture,
  draft,
  evaluated,
  PASSWORD,
} = require("./postgres-fixture.cjs");
const { Lab } = require("../server/lab.cjs");
const { examples } = require("../server/research.cjs");
const { createServer } = require("../server/http.cjs");
const security = require("../server/security.cjs");
const approve = (f, d, key = d.id) =>
  f.lab.authorize(f.alice, d.id, { demoCode: "0000" }, key);
const errorCode = (code) => (error) => error.code === code;

test("PostgreSQL: migrações, inteiros e transferência bilateral idempotente", async (t) => {
  const f = await fixture(t);
  assert.equal(
    (await f.db.prepare("SELECT COUNT(*) n FROM schema_migrations").get()).n,
    3,
  );
  const d = await evaluated(f);
  const tx = await approve(f, d);
  const retry = await approve(f, d);
  assert.equal(tx.id, retry.id);
  assert.equal(await f.lab.balance(f.a.id), 175000);
  assert.equal(await f.lab.balance(f.b.id), 125000);
  assert.equal(
    tx.entries.reduce((sum, e) => sum + e.deltaCents, 0),
    0,
  );
  assert(
    (await f.lab.statement(f.bob, f.b.id)).entries.some(
      (x) => x.transferId === tx.id,
    ),
  );
});
test("PostgreSQL: domínio rejeita dinheiro inválido sem alterar histórico", async (t) => {
  const f = await fixture(t);
  const counts = async () =>
    JSON.stringify(
      await f.db
        .prepare(
          "SELECT (SELECT COUNT(*) FROM drafts) drafts,(SELECT COUNT(*) FROM audit_events) audit,(SELECT COUNT(*) FROM transfers) transfers",
        )
        .get(),
    );
  const before = await counts();
  for (const amount of [NaN, Infinity, "100", 0, -1, 1.5, {}, null])
    await assert.rejects(() => draft(f, amount), errorCode("INVALID_MONEY"));
  assert.equal(await counts(), before);
  assert.equal(await f.lab.balance(f.a.id), 200000);
});
test("PostgreSQL: autenticação, alias sem distinção de caixa e permissão", async (t) => {
  const f = await fixture(t);
  await assert.rejects(
    () =>
      security.register(f.db, {
        alias: "PARTICIPANT-A",
        password: PASSWORD,
        consent: true,
      }),
    errorCode("ALIAS_EXISTS"),
  );
  const auth = await security.login(
    f.db,
    { alias: "PARTICIPANT-A", password: PASSWORD },
    f.clock(),
  );
  assert.equal(
    (await security.authenticate(f.db, auth.secret, f.clock())).id,
    f.alice.id,
  );
  await assert.rejects(
    () => f.lab.account(f.bob, f.a.id),
    errorCode("ACCOUNT_ACCESS"),
  );
  await assert.rejects(
    () => f.lab.overview(f.alice, f.sessionId),
    errorCode("FORBIDDEN"),
  );
  await assert.rejects(
    () =>
      security.register(f.db, {
        alias: "forged-admin",
        password: PASSWORD,
        consent: true,
        role: "admin",
      }),
    errorCode("INVALID_INPUT"),
  );
});
test("PostgreSQL: concorrência entre pools independentes não permite saldo negativo", async (t) => {
  const f = await fixture(t),
    otherDb = await f.reconnect();
  t.after(() => otherDb.close());
  const other = new Lab(otherDb, { now: f.clock });
  const a = await evaluated(f, 150000),
    b = await evaluated(f, 150000);
  const results = await Promise.allSettled([
    approve(f, a, "concurrent-a"),
    other.authorize(f.alice, b.id, { demoCode: "0000" }, "concurrent-b"),
  ]);
  assert.equal(results.filter((x) => x.status === "fulfilled").length, 1);
  assert.equal(
    results.find((x) => x.status === "rejected").reason.code,
    "BALANCE",
  );
  assert.equal(await f.lab.balance(f.a.id), 50000);
  assert.equal(await f.lab.balance(f.b.id), 250000);
});
test("PostgreSQL: falha no crédito reverte transferência, débito e sucesso", async (t) => {
  const f = await fixture(t),
    d = await evaluated(f);
  await f.db.exec(
    "CREATE FUNCTION fixture_fail_credit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.delta_cents>0 THEN RAISE EXCEPTION 'injected credit failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER fixture_fail_credit BEFORE INSERT ON ledger_entries FOR EACH ROW EXECUTE FUNCTION fixture_fail_credit();",
  );
  await assert.rejects(() => approve(f, d), /injected credit failure/);
  assert.equal(await f.lab.balance(f.a.id), 200000);
  assert.equal(await f.lab.balance(f.b.id), 100000);
  assert.equal(
    (
      await f.db
        .prepare("SELECT COUNT(*) n FROM transfers WHERE kind='pix'")
        .get()
    ).n,
    0,
  );
  assert.notEqual((await f.lab.draft(f.alice, d.id)).status, "completed");
  await f.db.exec("DROP TRIGGER fixture_fail_credit ON ledger_entries");
  await approve(f, d);
});
test("PostgreSQL: pausa, expiração e mudança da chave são revalidadas", async (t) => {
  const f = await fixture(t, { pauseMs: 5000 }),
    d = await evaluated(f);
  await assert.rejects(() => approve(f, d), errorCode("PAUSE"));
  f.advance(5000);
  await f.lab.changeKey(f.bob, f.b.keys[0].id);
  await assert.rejects(() => approve(f, d), errorCode("RECIPIENT_CHANGED"));
  assert.equal(await f.lab.balance(f.a.id), 200000);
});
test("PostgreSQL: isolamento entre sessões e chaves externas", async (t) => {
  const f = await fixture(t);
  const second = await f.lab.createSession(f.admin, {
    name: "Outro ambiente isolado",
  });
  const account = await f.lab.createAccount(f.admin, second.id, {
    name: "Conta externa sintética",
    profile: "person",
  });
  await assert.rejects(
    () =>
      f.lab.createDraft(f.alice, f.sessionId, {
        sourceId: f.a.id,
        key: account.keys[0].value,
        amountCents: 100,
      }),
    errorCode("RECIPIENT"),
  );
  await assert.rejects(
    () => f.lab.session(f.alice, second.id),
    errorCode("FORBIDDEN"),
  );
});
test("PostgreSQL: snapshots e repetição preservam base e configuração", async (t) => {
  const f = await fixture(t);
  const ex = examples()[0];
  const scenario = await f.lab.createScenario(f.admin, f.sessionId, ex);
  const run = await f.lab.startRun(f.admin, f.sessionId, scenario.id, {
    condition: "integrated",
    pauseMs: 0,
  });
  const repeat = await f.lab.repeatRun(f.admin, run.id);
  assert.equal(run.baselineHash, repeat.baselineHash);
  const snap = await f.lab.snapshot(f.admin, f.sessionId, {
    name: "Base persistente",
  });
  const restored = await f.lab.restore(f.admin, snap.id, {
    name: "Cópia restaurada",
  });
  assert.notEqual(restored.id, f.sessionId);
  assert.equal(
    (await f.lab.accounts(f.alice, restored.id))[0].balanceCents,
    200000,
  );
});
test("PostgreSQL: matriz VP/FP/VN/FN e exportação não usam gabarito como sinal", async (t) => {
  const f = await fixture(t);
  for (const example of examples()) {
    const scenario = await f.lab.createScenario(f.admin, f.sessionId, example);
    const run = await f.lab.startRun(f.admin, f.sessionId, scenario.id, {
      condition: "integrated",
      pauseMs: 0,
    });
    const op = (await f.lab.tasks(f.admin, run.sessionId))[0];
    const d = await f.lab.taskDraft(f.admin, op.id, { requestContext: true });
    const result = await f.lab.evaluateDraft(f.admin, d.id, {
      answers: example.baseline.operations[0].answers,
      acknowledged: true,
    });
    if (result.status === "pause")
      await f.lab.authorize(
        f.admin,
        d.id,
        { demoCode: "0000" },
        "matrix-" + d.id,
      );
  }
  const metrics = await f.lab.metrics(f.admin, f.sessionId);
  assert.equal(metrics.rows.length, 4);
  const exported = await f.lab.exportResearch(f.admin, f.sessionId, "json");
  const parsed = JSON.parse(exported.body);
  assert.equal(parsed.executions.length, 4);
  assert(!exported.body.includes("password_hash"));
  assert(!exported.body.includes("scrypt:"));
  const quadrants = metrics.groups.reduce(
    (a, g) => {
      for (const key of ["TP", "FP", "TN", "FN"]) a[key] += g[key] || 0;
      return a;
    },
    { TP: 0, FP: 0, TN: 0, FN: 0 },
  );
  assert.deepEqual(quadrants, { TP: 1, FP: 1, TN: 1, FN: 1 });
});
test("PostgreSQL: registros financeiros e auditoria são imutáveis", async (t) => {
  const f = await fixture(t);
  for (const table of ["ledger_entries", "transfers", "audit_events"])
    await assert.rejects(() => f.db.exec(`DELETE FROM ${table}`), /immutable/);
});
test("PostgreSQL: dados e autenticação persistem após fechar e reabrir pool", async (t) => {
  const f = await fixture(t),
    d = await evaluated(f);
  const auth = await security.login(
    f.db,
    { alias: f.alice.alias, password: PASSWORD },
    f.clock(),
  );
  await approve(f, d);
  await f.db.close();
  const db = await f.reconnect();
  t.after(() => db.close());
  const lab = new Lab(db);
  assert.equal(await lab.balance(f.a.id), 175000);
  assert.equal(
    (await security.authenticate(db, auth.secret, f.clock())).id,
    f.alice.id,
  );
});
test("PostgreSQL HTTP: login, CSRF, autorização e extrato bilateral", async (t) => {
  const f = await fixture(t);
  const server = createServer(f.db, { rateLimit: false, now: f.clock });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((r) => server.close(r)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const login = await fetch(base + "/api/auth/login", {
    method: "POST",
    headers: { Origin: base, "Content-Type": "application/json" },
    body: JSON.stringify({ alias: f.alice.alias, password: PASSWORD }),
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie").split(";")[0],
    csrf = (await login.json()).csrf;
  const request = async (path, body, headers = {}) =>
    fetch(base + path, {
      method: "POST",
      headers: {
        Origin: base,
        "Content-Type": "application/json",
        Cookie: cookie,
        "X-CSRF-Token": csrf,
        ...headers,
      },
      body: JSON.stringify(body),
    });
  const made = await request(`/api/sessions/${f.sessionId}/drafts`, {
    sourceId: f.a.id,
    key: f.b.keys[0].value,
    amountCents: 25000,
  });
  assert.equal(made.status, 201);
  const d = await made.json();
  assert.equal((await request(`/api/drafts/${d.id}/evaluate`, {})).status, 200);
  assert.equal(
    (
      await request(
        `/api/drafts/${d.id}/authorize`,
        { demoCode: "0000" },
        { "X-CSRF-Token": "bad", "Idempotency-Key": "http-test" },
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await request(
        `/api/drafts/${d.id}/authorize`,
        { demoCode: "0000" },
        { "Idempotency-Key": "http-test" },
      )
    ).status,
    200,
  );
  assert.equal(await f.lab.balance(f.a.id), 175000);
  assert.equal(await f.lab.balance(f.b.id), 125000);
  assert.equal((await fetch(base + "/api/health")).status, 200);
});

test("PostgreSQL: revisão preserva decisão e liberação posterior respeita novo fluxo", async (t) => {
  const f = await fixture(t),
    d = await draft(f, 25000, { requestContext: true });
  const blocked = await f.lab.evaluateDraft(f.alice, d.id, {
    answers: { identity: "no", urgency: "yes", advance: "yes", ignore: "yes" },
    acknowledged: true,
  });
  assert.equal(blocked.status, "blocked");
  const evaluationId = blocked.evaluation.id;
  const review = await f.lab.requestReview(f.alice, d.id, {
    reason: "Teste de revisão de falso positivo",
  });
  await f.lab.resolveReview(f.admin, review.id, {
    decision: "release",
    reason: "Verificação humana demonstrativa",
  });
  const follow = await f.lab.followup(f.alice, review.id);
  const checked = await f.lab.evaluateDraft(f.alice, follow.id, {});
  assert.equal(checked.status, "pause");
  await approve(f, checked);
  assert.equal((await f.lab.draft(f.alice, d.id)).status, "blocked");
  assert.equal(
    (await f.lab.evaluation(f.alice, evaluationId)).decision.action,
    "BLOCKED",
  );
});
test("PostgreSQL: inicialização concorrente não repete migrações", async (t) => {
  const f = await fixture(t);
  const databases = await Promise.all([f.reconnect(), f.reconnect()]);
  try {
    for (const db of databases)
      assert.equal(
        (await db.prepare("SELECT COUNT(*) n FROM schema_migrations").get()).n,
        3,
      );
  } finally {
    await Promise.all(databases.map((db) => db.close()));
  }
});
test("PostgreSQL: bootstrap simultâneo cria um único administrador e não redefine senha", async (t) => {
  const { bootstrapAdmin } = require("../server/bootstrap-admin.cjs");
  const f = await fixture(t, { empty: true }),
    other = await f.reconnect();
  t.after(() => other.close());
  const options = { alias: "bootstrap-admin", password: PASSWORD };
  const results = await Promise.allSettled([
    bootstrapAdmin(f.db, options),
    bootstrapAdmin(other, options),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(
    (
      await f.db
        .prepare("SELECT COUNT(*) n FROM users WHERE global_role='admin'")
        .get()
    ).n,
    1,
  );
  assert.equal(
    await bootstrapAdmin(f.db, {
      ...options,
      password: "different-exclusive-password",
      skipExisting: true,
    }),
    null,
  );
  await security.login(f.db, { alias: options.alias, password: PASSWORD });
});

test("PostgreSQL: processo Render inicia com bootstrap privado e preserva acesso após reinício", async (t) => {
  const { spawn } = require("node:child_process"),
    net = require("node:net");
  const f = await fixture(t, { empty: true });
  const reserve = net.createServer();
  reserve.listen(0, "127.0.0.1");
  await once(reserve, "listening");
  const port = reserve.address().port;
  await new Promise((r) => reserve.close(r));
  const origin = `http://127.0.0.1:${port}`;
  let child,
    log = "";
  const stop = async () => {
    if (child && child.exitCode === null) {
      child.kill("SIGTERM");
      await once(child, "exit");
    }
  };
  t.after(stop);
  async function launch(password) {
    child = spawn(process.execPath, ["server/index.cjs"], {
      cwd: require("node:path").resolve(__dirname, ".."),
      env: {
        ...process.env,
        RENDER: "true",
        DATABASE_URL: f.connectionString,
        PG_ALLOW_INSECURE_LOCAL: "1",
        HOST: "127.0.0.1",
        PORT: String(port),
        PUBLIC_ORIGIN: origin,
        JUSTEC_ADMIN_ALIAS: "render-operator",
        JUSTEC_ADMIN_PASSWORD: password,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (x) => (log += x));
    child.stderr.on("data", (x) => (log += x));
    for (let i = 0; i < 100; i++) {
      try {
        const r = await fetch(origin + "/api/health");
        if (r.status === 200) {
          assert.equal((await r.json()).storage, "postgres");
          return;
        }
      } catch {}
      if (child.exitCode !== null) break;
      await new Promise((r) => setTimeout(r, 50));
    }
    throw Error("Processo não ficou pronto; conexão privada omitida.");
  }
  async function login(password) {
    return fetch(origin + "/api/auth/login", {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ alias: "render-operator", password }),
    });
  }
  await launch(PASSWORD);
  assert.equal((await login(PASSWORD)).status, 200);
  await stop();
  await launch("another-exclusive-synthetic-password");
  assert.equal((await login(PASSWORD)).status, 200);
  assert.equal(
    (
      await f.db
        .prepare("SELECT COUNT(*) n FROM users WHERE global_role='admin'")
        .get()
    ).n,
    1,
  );
  assert(!log.includes(PASSWORD));
  assert(!log.includes(f.connectionString));
});

test("PostgreSQL: extrato mantém saldo e lançamentos coerentes durante envio concorrente", async (t) => {
  const f = await fixture(t);
  await approve(f, await evaluated(f));
  const next = await evaluated(f, 5000),
    otherDb = await f.reconnect();
  t.after(() => otherDb.close());
  const other = new Lab(otherDb, { now: f.clock });
  let release, read;
  const reached = new Promise((r) => (read = r)),
    gate = new Promise((r) => (release = r));
  const original = f.lab.all.bind(f.lab);
  f.lab.all = async function (sql, ...args) {
    const rows = await original(sql, ...args);
    if (sql.startsWith("SELECT l.*,t.kind")) {
      read();
      await gate;
    }
    return rows;
  };
  const statement = f.lab.statement(f.alice, f.a.id);
  await reached;
  let committed = false;
  const sending = other
    .authorize(f.alice, next.id, { demoCode: "0000" }, "snapshot-transfer")
    .then((r) => {
      committed = true;
      return r;
    });
  try {
    await new Promise((r) => setTimeout(r, 40));
    assert.equal(committed, false);
  } finally {
    release();
  }
  const snapshot = await statement;
  await sending;
  assert.equal(snapshot.balanceCents, 175000);
  assert.equal(snapshot.entries[0].balanceAfterCents, 175000);
  assert.equal(await f.lab.balance(f.a.id), 170000);
});
