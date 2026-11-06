"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { fixture, PASSWORD } = require(process.env.JUSTEC_TEST_POSTGRES_URL ? "./postgres-fixture.cjs" : "./lab-fixture.cjs");
const { examples } = require("../server/research.cjs");
const security = require("../server/security.cjs");
const body = (extra = {}) => ({ condition: "education", pauseMs: 5000, ...extra });
const counts = async f => Object.fromEntries(await Promise.all(
  ["sessions", "accounts", "ledger_entries", "runs", "run_operations", "audit_events"].map(async name =>
    [name, (await f.db.prepare(`SELECT COUNT(*) n FROM ${name}`).get()).n])));
async function setup(t) {
  const f = await fixture(t);
  const scenario = await f.lab.createScenario(f.admin, f.sessionId, examples()[0]);
  const create = (value = body(), key = "pair-request-00000001", user = f.admin, scenarioId = scenario.id) =>
    f.lab.startRunPair(user, f.sessionId, scenarioId, value, key);
  return { f, scenario, create };
}
test("Par preserva base, titulares, operações e regras; apenas pausa muda e nada inicia", async t => {
  const { f, create } = await setup(t);
  const pair = await create(body({ owners: { ana: f.alice.id, robson: f.bob.id } }));
  assert.notEqual(pair.control.id, pair.paused.id);
  assert.notEqual(pair.control.sessionId, pair.paused.sessionId);
  assert.equal(pair.control.baselineHash, pair.paused.baselineHash);
  const rows = await Promise.all([pair.control, pair.paused].map(arm =>
    f.db.prepare("SELECT * FROM runs WHERE id=?").get(arm.id)));
  const configs = rows.map(r => JSON.parse(r.config_snapshot));
  assert.deepEqual(configs.map(c => c.pauseMs), [0, 5000]);
  const fixed = configs.map(({ pauseMs, ...rest }) => rest);
  assert.deepEqual(fixed[0], fixed[1]);
  assert.equal(pair.fixedSettingsHash, security.hash(JSON.stringify(fixed[0])));
  for (const [slot, owner] of [["ana", f.alice.id], ["robson", f.bob.id]]) {
    const ids = rows.map(r => JSON.parse(r.account_map)[slot]);
    assert.notEqual(ids[0], ids[1]);
    const accounts = await Promise.all(ids.map(aid => f.db.prepare("SELECT owner_id,profile,limit_cents FROM accounts WHERE id=?").get(aid)));
    assert.deepEqual(accounts[0], accounts[1]);
    assert.equal(accounts[0].owner_id, owner);
    assert.equal(await f.lab.balance(ids[0]), await f.lab.balance(ids[1]));
  }
  const operations = await Promise.all(rows.map(r => f.db.prepare("SELECT operation_id,amount_cents,scripted_answers FROM run_operations WHERE run_id=? ORDER BY operation_id").all(r.id)));
  assert.deepEqual(operations[0], operations[1]);
  assert.equal((await f.db.prepare("SELECT COUNT(*) n FROM drafts").get()).n, 0);
  const listed = await f.lab.runPairs(f.admin, f.sessionId);
  assert.equal(listed.length, 1);
  assert.equal(listed[0].control.currentConfigurationMatches, true);
  assert.equal(listed[0].control.sessionUpdated, false);
  assert.equal(listed[0].control.journey.notStarted, operations[0].length);
  assert.equal(listed[0].paused.journey.completed, 0);
});
test("Identificador repetido é idempotente, concorrência não duplica e conflito é rejeitado", async t => {
  const { f, create } = await setup(t);
  const [a, b] = await Promise.all([Promise.resolve().then(() => create()), Promise.resolve().then(() => create())]);
  assert.deepEqual(a, b);
  const before = await counts(f);
  await f.lab.updateSession(f.admin, f.sessionId, { config: { pauseMs: 123, rules: { newRecipient: 21 } } });
  const afterUpdate = await counts(f);
  assert.deepEqual(await create(), a);
  assert.deepEqual(await counts(f), afterUpdate);
  await assert.rejects(async () => create(body({ pauseMs: 1000 })), e => e.code === "PAIR_CONFLICT");
  assert.equal(before.runs, 2);
  assert.equal((await counts(f)).runs, 2);
});
test("Falha na segunda execução reverte as duas, inclusive livro-razão e auditoria", async t => {
  const { f, create } = await setup(t);
  const before = await counts(f);
  const original = f.lab._createRun;
  let calls = 0;
  f.lab._createRun = function (...args) {
    if (++calls === 2) throw new Error("second run failure");
    return original.apply(this, args);
  };
  try { await assert.rejects(async () => create(), /second run failure/); }
  finally { f.lab._createRun = original; }
  assert.equal(calls, 2);
  assert.deepEqual(await counts(f), before);
  assert.equal((await create()).paused.pauseConfiguredMs, 5000);
});
test("Valida duração, modo, identificador, cenário e vínculos sem mutação", async t => {
  const { f, create } = await setup(t);
  const before = await counts(f);
  for (const invalid of [0, -1, NaN, Infinity, "5000", 1.5, 60001, null])
    await assert.rejects(async () => create(body({ pauseMs: invalid })));
  for (const invalid of [body({ condition: "none" }), body({ condition: "other" }), body({ owners: [] }),
    body({ owners: { unknown: f.alice.id } }), body({ owners: { ana: f.outsider.id } }), body({ rules: {} })])
    await assert.rejects(async () => create(invalid));
  await assert.rejects(async () => create(body(), "short"));
  await assert.rejects(async () => create(body(), undefined, f.admin, "missing-scenario"));
  assert.deepEqual(await counts(f), before);
});
test("Participante não cria/lê pares; pesquisador autorizado cria e ambientes alterados são sinalizados", async t => {
  const { f, create } = await setup(t);
  await assert.rejects(async () => create(body(), "pair-request-00000001", f.alice), e => e.status === 403);
  await assert.rejects(async () => f.lab.runPairs(f.alice, f.sessionId), e => e.status === 403);
  await f.lab.join(f.outsider, { code: (await f.lab.invite(f.admin, f.sessionId, { role: "researcher" })).code });
  const pair = await create(body(), "pair-request-00000002", f.outsider);
  await assert.rejects(async () => f.lab.updateSession(f.outsider, pair.paused.sessionId, { config: { pauseMs: 2345 } }), e => e.code === "RUN_CONFIG_FROZEN");
  await f.lab.updateSession(f.outsider, pair.paused.sessionId, { status: "archived" });
  const beforeTamper = await f.lab.runPairs(f.outsider, f.sessionId);
  assert.equal(beforeTamper[0].paused.currentConfigurationMatches, true);
  assert.equal(beforeTamper[0].paused.sessionUpdated, true);
  // Simula edição externa indevida no banco; a API continua recusando mudar a configuração.
  const raw = await f.db.prepare("SELECT config FROM sessions WHERE id=?").get(pair.paused.sessionId);
  const edited = { ...JSON.parse(raw.config), pauseMs: 2345 };
  await f.db.prepare("UPDATE sessions SET config=? WHERE id=?").run(JSON.stringify(edited), pair.paused.sessionId);
  const listed = await f.lab.runPairs(f.outsider, f.sessionId);
  assert.equal(listed[0].paused.currentConfigurationMatches, false);
  assert.equal(listed[0].paused.sessionUpdated, true);
  assert.equal(listed[0].paused.pauseConfiguredMs, 5000);
  assert.equal(listed[0].control.currentConfigurationMatches, true);
  const exported = JSON.parse((await f.lab.exportResearch(f.admin, f.sessionId, "json")).body);
  assert.equal(exported.pairs[0].id, pair.id);
  assert.equal(exported.pairs[0].paused.currentConfigurationMatches, false);
});
test("HTTP exige autenticação, CSRF e idempotência para criar e lista apenas para equipe", async t => {
  const { f, scenario } = await setup(t);
  const server = require("../server/http.cjs").createServer(f.db, { now: f.clock, rateLimit: false });
  server.listen(0, "127.0.0.1"); await require("node:events").once(server, "listening");
  t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const route = `/api/sessions/${f.sessionId}/scenarios/${scenario.id}/run-pairs`;
  const send = (path, value, headers = {}) => fetch(origin + path, {
    method: "POST", headers: { Origin: origin, "Content-Type": "application/json", ...headers }, body: JSON.stringify(value),
  });
  assert.equal((await send(route, body())).status, 401);
  const login = await send("/api/auth/login", { alias: f.admin.alias, password: PASSWORD });
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const { csrf } = await login.json();
  assert.equal((await send(route, body(), { Cookie: cookie })).status, 403);
  const headers = { Cookie: cookie, "X-CSRF-Token": csrf, "Idempotency-Key": "pair-request-http-0001" };
  const response = await send(route, body(), headers);
  assert.equal(response.status, 201);
  const pair = await response.json();
  assert.deepEqual(await (await send(route, body(), headers)).json(), pair);
  assert.equal((await send(route, body(), { ...headers, Origin: "https://other.invalid" })).status, 403);
  const listed = await fetch(origin + `/api/sessions/${f.sessionId}/run-pairs`, { headers: { Cookie: cookie } });
  assert.equal(listed.status, 200);
  assert.equal((await listed.json())[0].id, pair.id);
});
test("Espera do par é aplicada pelo servidor: 0 ms permite autorizar e 5000 ms exige aguardar", async t => {
  const { f, create } = await setup(t);
  const pair = await create();
  const drafts = [];
  for (const arm of [pair.control, pair.paused]) {
    const tasks = await f.lab.tasks(f.admin, arm.sessionId);
    const d = await f.lab.taskDraft(f.admin, tasks[0].id);
    const evaluated = await f.lab.evaluateDraft(f.admin, d.id, {});
    assert.equal(evaluated.status, "pause");
    drafts.push(evaluated);
  }
  assert.equal(drafts[1].readyAt - drafts[0].readyAt, 5000);
  const source = drafts[1].sourceId;
  const before = await f.lab.balance(source);
  await f.lab.authorize(f.admin, drafts[0].id, { demoCode: "0000" }, "pair-approval-control");
  await assert.rejects(async () => f.lab.authorize(f.admin, drafts[1].id, { demoCode: "0000" }, "pair-approval-paused"), e => e.code === "PAUSE");
  assert.equal(await f.lab.balance(source), before);
  f.advance(5000);
  await f.lab.authorize(f.admin, drafts[1].id, { demoCode: "0000" }, "pair-approval-paused");
  const [result] = await f.lab.runPairs(f.admin, f.sessionId);
  assert.equal(result.control.journey.completed, 1);
  assert.equal(result.paused.journey.completed, 1);
});
