"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { fixture, PASSWORD } = require(process.env.JUSTEC_TEST_POSTGRES_URL ? "./postgres-fixture.cjs" : "./lab-fixture.cjs");
const { examples } = require("../server/research.cjs");
const { summarizeExposure } = require("../server/pause-observations.cjs");
const visitId = "pause-visit-00000001";
const signal = event => ({ visitId, event });
async function setup(t, { enabled = true, evaluate = true } = {}) {
  const f = await fixture(t);
  const scenario = await f.lab.createScenario(f.admin, f.sessionId, examples()[0]);
  const run = await f.lab.startRun(f.admin, f.sessionId, scenario.id, { condition: "education", pauseMs: 1000, observePause: enabled });
  const tasks = await f.lab.tasks(f.admin, run.sessionId);
  let d = await f.lab.taskDraft(f.admin, tasks[0].id);
  if (evaluate) d = await f.lab.evaluateDraft(f.admin, d.id, {});
  const observe = body => f.lab.observePause(f.admin, d.id, body);
  return { f, d, run, observe };
}
test("Resumo vazio, visitas incompletas e intervalo zero não inventam leitura ou abandono", () => {
  assert.equal(summarizeExposure([]).summary.meanServerIntervalMs, null);
  const event = (type, time) => ({ payload: JSON.stringify({ draftId: "d", visitId: "v", runId: "r", evaluationId: "e", event: type }), created_at: time });
  assert.equal(summarizeExposure([event("opened", 0)]).summary.incompleteVisits, 1);
  const full = summarizeExposure([event("continue", 0), event("opened", 0)]);
  assert.equal(full.summary.meanServerIntervalMs, 0);
  assert.equal(full.summary.continued, 1);
  assert.equal(full.summary.incompleteVisits, 0);
  const invalidClock = summarizeExposure([event("opened", 20), event("leave", 10)]);
  assert.equal(invalidClock.summary.meanServerIntervalMs, null);
  assert.equal(invalidClock.summary.clockAnomalies, 1);
});
test("Ativação é explícita; fluxos comuns e execução sem opção não registram", async t => {
  const { f, d, observe } = await setup(t, { enabled: false });
  assert.equal(d.canObservePause, false);
  await assert.rejects(async () => observe(signal("opened")), e => e.code === "OBSERVATION_DISABLED");
  const normal = await f.lab.createDraft(f.alice, f.sessionId, { sourceId: f.a.id, key: f.b.keys[0].value, amountCents: 100 });
  assert.equal(normal.canObservePause, false);
  await assert.rejects(async () => f.lab.observePause(f.alice, normal.id, signal("opened")), e => e.code === "OBSERVATION_DISABLED");
  assert.equal((await f.lab.pauseExposure(f.admin, f.sessionId)).summary.openedVisits, 0);
});
test("Valida ator, etapa, evento, identificador e ordem; não aceita horários nem texto livre", async t => {
  const { f, d, observe } = await setup(t, { evaluate: false });
  const before = (await f.db.prepare("SELECT COUNT(*) n FROM audit_events").get()).n;
  await assert.rejects(async () => observe(signal("opened")), e => e.code === "STAGE");
  for (const invalid of [null, [], {}, signal("other"), { ...signal("opened"), visitId: "short" },
    { ...signal("opened"), timestamp: 0 }, { ...signal("opened"), text: "free text" }])
    await assert.rejects(async () => observe(invalid));
  await assert.rejects(async () => f.lab.observePause(f.bob, d.id, signal("opened")), e => e.status === 403);
  await f.lab.evaluateDraft(f.admin, d.id, {});
  await assert.rejects(async () => observe(signal("continue")), e => e.code === "OBSERVATION_ORDER");
  const exposure = await f.lab.pauseExposure(f.admin, f.sessionId);
  assert.equal(exposure.visits.length, 0);
  // A avaliação, não os sinais rejeitados, acrescenta os registros usuais.
  assert((await f.db.prepare("SELECT COUNT(*) n FROM audit_events").get()).n > before);
});
test("Abertura e saída são idempotentes sob concorrência; mesmo sinal não altera saldo ou autorização", async t => {
  const { f, d, observe } = await setup(t);
  const before = await f.lab.balance(d.sourceId);
  await Promise.all([Promise.resolve().then(() => observe(signal("opened"))), Promise.resolve().then(() => observe(signal("opened")))]);
  await assert.rejects(async () => observe(signal("continue")), e => e.code === "PAUSE");
  assert.equal(await f.lab.balance(d.sourceId), before);
  assert.equal((await f.lab.draft(f.admin, d.id)).status, "pause");
  f.advance(1000);
  await Promise.all([Promise.resolve().then(() => observe(signal("continue"))), Promise.resolve().then(() => observe(signal("continue")))]);
  await observe(signal("opened"));
  await assert.rejects(async () => observe(signal("hidden")), e => e.code === "OBSERVATION_CLOSED");
  const report = await f.lab.pauseExposure(f.admin, f.sessionId);
  assert.equal(report.summary.openedVisits, 1);
  assert.equal(report.summary.closedVisits, 1);
  assert.equal(report.summary.meanServerIntervalMs, 1000);
  assert.equal(await f.lab.balance(d.sourceId), before);
  assert.equal((await f.lab.draft(f.admin, d.id)).status, "pause");
  const rows = await f.db.prepare("SELECT payload FROM audit_events WHERE session_id=? AND action IN ('pause.opened','pause.closed')").all(d.sessionId);
  assert.equal(rows.length, 2);
  assert.equal(JSON.stringify(rows).includes("amountCents"), false);
  assert.equal(JSON.stringify(rows).includes(PASSWORD), false);
});
test("Saída pode chegar após o resultado; novas visitas e perda de saída permanecem distintas", async t => {
  const { f, d, observe } = await setup(t);
  await observe(signal("opened"));
  await observe(signal("hidden"));
  const second = { visitId: "pause-visit-00000002", event: "opened" };
  await observe(second);
  f.advance(1000);
  await f.lab.authorize(f.admin, d.id, { demoCode: "0000" }, "pause-authorize-test");
  await observe({ ...second, event: "continue" });
  const report = await f.lab.pauseExposure(f.admin, f.sessionId);
  assert.equal(report.summary.openedVisits, 2);
  assert.equal(report.summary.hidden, 1);
  assert.equal(report.summary.continued, 1);
  assert.equal(report.summary.closedVisits, 2);
  const exported = JSON.parse((await f.lab.exportResearch(f.admin, f.sessionId, "json")).body);
  assert.equal(exported.pauseExposure.summary.openedVisits, 2);
  await assert.rejects(async () => f.lab.pauseExposure(f.alice, f.sessionId), e => e.status === 403);
});
test("Registro incompleto não é cancelamento e falha de registro não impede autorização", async t => {
  const { f, d, observe } = await setup(t);
  await observe(signal("opened"));
  const original = f.lab.audit;
  f.lab.audit = function (sid, actor, action, ...rest) {
    if (action === "pause.closed") throw new Error("observation failure");
    return original.call(this, sid, actor, action, ...rest);
  };
  try { await assert.rejects(async () => observe(signal("leave")), /observation failure/); }
  finally { f.lab.audit = original; }
  f.advance(1000);
  await f.lab.authorize(f.admin, d.id, { demoCode: "0000" }, "pause-no-observation");
  const report = await f.lab.pauseExposure(f.admin, f.sessionId);
  assert.equal(report.summary.incompleteVisits, 1);
  assert.equal(report.summary.meanServerIntervalMs, null);
  assert.equal((await f.lab.draft(f.admin, d.id)).status, "completed");
});
test("HTTP exige sessão, origem e CSRF; relatório continua restrito", async t => {
  const { f, d } = await setup(t);
  const server = require("../server/http.cjs").createServer(f.db, { now: f.clock, rateLimit: false });
  server.listen(0, "127.0.0.1"); await require("node:events").once(server, "listening");
  t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const send = (path, value, headers = {}) => fetch(origin + path, { method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json", ...headers }, body: JSON.stringify(value) });
  const path = `/api/drafts/${d.id}/pause-observations`;
  assert.equal((await send(path, signal("opened"))).status, 401);
  const logged = await send("/api/auth/login", { alias: f.admin.alias, password: PASSWORD });
  const cookie = logged.headers.get("set-cookie").split(";")[0];
  const { csrf } = await logged.json();
  assert.equal((await send(path, signal("opened"), { Cookie: cookie })).status, 403);
  const headers = { Cookie: cookie, "X-CSRF-Token": csrf };
  assert.equal((await send(path, signal("opened"), { ...headers, Origin: "https://other.invalid" })).status, 403);
  assert.equal((await send(path, signal("opened"), headers)).status, 200);
  const report = await fetch(origin + `/api/sessions/${f.sessionId}/pause-exposure`, { headers: { Cookie: cookie } });
  assert.equal(report.status, 200);
  assert.equal((await report.json()).summary.openedVisits, 1);
});
test("Ativar observação não altera decisões, pesos ou espera dos quatro cenários", async t => {
  const f = await fixture(t);
  for (const example of examples()) {
    const scenario = await f.lab.createScenario(f.admin, f.sessionId, example);
    const results = [];
    for (const enabled of [false, true]) {
      const run = await f.lab.startRun(f.admin, f.sessionId, scenario.id, { condition: "integrated", pauseMs: 0, observePause: enabled });
      const all = await f.lab.runs(f.admin, f.sessionId);
      const op = all.find(r => r.id === run.id).operations[0];
      const d = await f.lab.taskDraft(f.admin, op.id);
      const evaluated = await f.lab.evaluateDraft(f.admin, d.id, { answers: JSON.parse(op.scripted_answers), acknowledged: true });
      results.push({ status: evaluated.status, decision: evaluated.evaluation.decision, rules: evaluated.evaluation.rules, version: evaluated.evaluation.rulesVersion, pauseMs: evaluated.evaluation.pauseMs });
    }
    assert.deepEqual(results[0], results[1]);
  }
});
test("Configuração antiga sem opção permanece sem coleta e repetição conserva seu retrato", async t => {
  const { f, run } = await setup(t, { enabled: false });
  const row = await f.db.prepare("SELECT config_snapshot FROM runs WHERE id=?").get(run.id);
  const old = JSON.parse(row.config_snapshot); delete old.observePause;
  const snapshot = JSON.stringify(old);
  await f.db.prepare("UPDATE runs SET config_snapshot=?,config_hash=? WHERE id=?").run(snapshot, require("../server/security.cjs").hash(snapshot), run.id);
  await f.db.prepare("UPDATE sessions SET config=? WHERE id=?").run(snapshot, run.sessionId);
  const repeat = await f.lab.repeatRun(f.admin, run.id);
  const copied = await f.db.prepare("SELECT config_snapshot FROM runs WHERE id=?").get(repeat.id);
  assert.equal(copied.config_snapshot, snapshot);
  const [task] = await f.lab.tasks(f.admin, repeat.sessionId);
  assert.equal((await f.lab.taskDraft(f.admin, task.id)).canObservePause, false);
  await assert.rejects(async () => f.lab.startRun(f.admin, f.sessionId, (await f.lab.runs(f.admin, f.sessionId))[0].scenario_id,
    { condition: "education", observePause: "true" }));
});
test("Par mantém ativação igual e separa os sinais de cada execução", async t => {
  const f = await fixture(t);
  const scenario = await f.lab.createScenario(f.admin, f.sessionId, examples()[0]);
  const pair = await f.lab.startRunPair(f.admin, f.sessionId, scenario.id,
    { condition: "education", pauseMs: 1000, observePause: true }, "pause-pair-observed-001");
  for (const arm of [pair.control, pair.paused]) {
    const config = JSON.parse((await f.db.prepare("SELECT config_snapshot FROM runs WHERE id=?").get(arm.id)).config_snapshot);
    assert.equal(config.observePause, true);
  }
  const [task] = await f.lab.tasks(f.admin, pair.control.sessionId);
  const d = await f.lab.taskDraft(f.admin, task.id);
  await f.lab.evaluateDraft(f.admin, d.id, {});
  await f.lab.observePause(f.admin, d.id, signal("opened"));
  await f.lab.observePause(f.admin, d.id, signal("continue"));
  const [listed] = await f.lab.runPairs(f.admin, f.sessionId);
  assert.equal(listed.control.pauseExposure.enabled, true);
  assert.equal(listed.control.pauseExposure.openedVisits, 1);
  assert.equal(listed.paused.pauseExposure.enabled, true);
  assert.equal(listed.paused.pauseExposure.openedVisits, 0);
  assert.equal(listed.paused.pauseExposure.meanServerIntervalMs, null);
});
