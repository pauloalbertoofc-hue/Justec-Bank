"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { summarizeJourneys } = require("../server/study-summary.cjs");
const { fixture } = require(process.env.JUSTEC_TEST_POSTGRES_URL ? "./postgres-fixture.cjs" : "./lab-fixture.cjs");
const { examples } = require("../server/research.cjs");
const row = (status, n, label = "legitimate", reconsidered = false) => ({
  runId: "run-1", operationId: `op-${n}`, status, label, reconsidered,
});
test("Resumo inclui todos os desfechos sem confundir cancelamento com bloqueio", () => {
  const input = [row("not_started", 1), row("review", 2), row("verification", 3), row("pause", 4),
    row("completed", 5), row("blocked", 6, "fraudulent"), row("cancelled", 7, "fraudulent", true)];
  const snapshot = JSON.stringify(input);
  input.forEach(Object.freeze); Object.freeze(input);
  const s = summarizeJourneys(input);
  assert.equal(s.assigned, 7);
  assert.equal(s.notStarted, 1);
  assert.equal(s.inProgress, 3);
  assert.equal(s.completed, 1);
  assert.equal(s.blocked, 1);
  assert.equal(s.cancelled, 1);
  assert.equal(s.reconsidered, 1);
  assert.equal(s.completionRate, 1 / 7);
  assert.equal(s.cancellationRate, 1 / 7);
  assert.equal(s.resolutionRate, 3 / 7);
  assert.equal(s.byLabel.legitimate.assigned, 5);
  assert.equal(s.byLabel.fraudulent.cancelled, 1);
  assert.equal(JSON.stringify(input), snapshot);
});
test("Amostra vazia tem taxas nulas, e reconsideração histórica pode terminar concluída", () => {
  assert.equal(summarizeJourneys([]).completionRate, null);
  const s = summarizeJourneys([row("completed", 1, "legitimate", true)]);
  assert.equal(s.reconsidered, 1);
  assert.equal(s.cancelled, 0);
  assert.equal(s.completionRate, 1);
});
test("Recusa entradas inválidas e duplicadas; mesmo ID em execuções diferentes é permitido", () => {
  for (const input of [null, {}, [null], [row("unknown", 1)], [{ ...row("review", 1), label: "unknown" }],
    [{ ...row("review", 1), reconsidered: "true" }], [row("review", 1), row("review", 1)]])
    assert.throws(() => summarizeJourneys(input), TypeError);
  assert.equal(summarizeJourneys([row("completed", 1), { ...row("completed", 1), runId: "run-2" }]).assigned, 2);
});
test("Métricas integram não iniciadas, revisão, cancelamento, conclusão e reconsideração sem alterar matriz", async t => {
  const f = await fixture(t);
  const scenario = await f.lab.createScenario(f.admin, f.sessionId, examples()[0]);
  const create = async pauseMs => {
    const run = await f.lab.startRun(f.admin, f.sessionId, scenario.id, { condition: "education", pauseMs });
    const runs = await f.lab.runs(f.admin, f.sessionId);
    return runs.find(r => r.id === run.id).operations[0];
  };
  await create(5000); // Ainda não iniciada.
  const reviewOp = await create(5000);
  await f.lab.taskDraft(f.admin, reviewOp.id);
  const cancelled = await f.lab.taskDraft(f.admin, (await create(5000)).id);
  await f.lab.cancelDraft(f.admin, cancelled.id, { reason: "Conferência voluntária fictícia." });
  for (const revise of [false, true]) {
    let d = await f.lab.taskDraft(f.admin, (await create(5000)).id);
    if (revise) {
      await f.lab.cancelDraft(f.admin, d.id, { reason: "Verificar novamente." });
      d = await f.lab.reviseDraft(f.admin, d.id);
    }
    await f.lab.evaluateDraft(f.admin, d.id, {});
    f.advance(5000);
    await f.lab.authorize(f.admin, d.id, { demoCode: "0000" }, "study-" + d.id);
  }
  await create(0);
  await f.lab.updateSession(f.admin, f.sessionId, { config: { pauseMs: 1234 } });
  const before = await f.db.prepare("SELECT COUNT(*) n FROM audit_events").get();
  const metrics = await f.lab.metrics(f.admin, f.sessionId);
  const g = metrics.groups.find(g => g.pauseConfiguredMs === 5000);
  assert.equal(metrics.groups.length, 2);
  assert.deepEqual([g.journey.assigned, g.journey.notStarted, g.journey.inProgress, g.journey.completed, g.journey.cancelled, g.journey.reconsidered], [5, 1, 1, 2, 1, 2]);
  assert.deepEqual([g.TN, g.TP, g.FP, g.FN, g.n, g.pending, g.cancelled], [2, 0, 0, 0, 2, 2, 1]);
  assert.equal(g.journey.completionRate, 2 / 5);
  assert.equal(g.journey.byLabel.fraudulent.assigned, 0);
  assert.equal(metrics.rows.length, 6);
  assert.equal(metrics.groups.find(g => g.pauseConfiguredMs === 0).journey.notStarted, 1);
  assert.deepEqual(await f.db.prepare("SELECT COUNT(*) n FROM audit_events").get(), before);
  await assert.rejects(async () => f.lab.metrics(f.alice, f.sessionId), e => e.status === 403);
  const csv = await f.lab.exportResearch(f.admin, f.sessionId, "csv");
  assert.match(csv.body.split("\r\n")[0], /"pauseConfiguredMs","reconsidered"/);
  const exported = JSON.parse((await f.lab.exportResearch(f.admin, f.sessionId, "json")).body);
  assert.equal(exported.metrics.groups.find(g => g.pauseConfiguredMs === 5000).journey.assigned, 5);
});
