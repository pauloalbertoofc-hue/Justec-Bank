"use strict";
const { flow } = require("./flow.cjs");
const { exact, fail, hash } = require("./security.cjs");
const EVENTS = new Set(["opened", "continue", "reconsider", "leave", "hidden"]);
function summarizeExposure(events) {
  const visits = new Map();
  for (const event of events) {
    const value = JSON.parse(event.payload);
    const key = JSON.stringify([value.draftId, value.visitId]);
    if (!visits.has(key)) visits.set(key, {
      draftId: value.draftId, visitId: value.visitId, runId: value.runId,
      evaluationId: value.evaluationId, openedAt: null, closedAt: null, action: null,
    });
    const visit = visits.get(key);
    if (value.event === "opened") visit.openedAt = event.created_at;
    else { visit.closedAt = event.created_at; visit.action = value.event; }
  }
  const rows = [...visits.values()].map(v => ({ ...v,
    serverIntervalMs: v.openedAt !== null && v.closedAt !== null
      && v.closedAt >= v.openedAt ? v.closedAt - v.openedAt : null,
  }));
  return {
    definition: "Sinais declarados pelo navegador, com horários de recebimento no servidor. Não comprovam leitura, atenção ou tempo efetivo em tela. Ausência de saída não comprova abandono.",
    visits: rows,
    summary: summarizeVisits(rows),
  };
}
function summarizeVisits(rows) {
  const intervals = rows.filter(v => v.serverIntervalMs !== null).map(v => v.serverIntervalMs);
  return {
    openedVisits: rows.filter(v => v.openedAt !== null).length,
    closedVisits: rows.filter(v => v.closedAt !== null).length,
    incompleteVisits: rows.filter(v => v.openedAt === null || v.closedAt === null).length,
    clockAnomalies: rows.filter(v => v.openedAt !== null && v.closedAt !== null && v.serverIntervalMs === null).length,
    continued: rows.filter(v => v.action === "continue").length,
    reconsidered: rows.filter(v => v.action === "reconsider").length,
    leftView: rows.filter(v => v.action === "leave").length,
    hidden: rows.filter(v => v.action === "hidden").length,
    meanServerIntervalMs: intervals.length ? intervals.reduce((a,b) => a+b, 0) / intervals.length : null,
  };
}
function attachPauseObservations(Lab) {
  Lab.prototype.observePause = flow(function* (user, did, body) {
    exact(body, ["visitId", "event"]);
    if (!body || typeof body.visitId !== "string" || !/^[A-Za-z0-9_-]{16,100}$/.test(body.visitId) || !EVENTS.has(body.event))
      fail(400, "PAUSE_OBSERVATION", "Registro de pausa inválido.");
    return yield this.tx(flow(function* () {
      const d = yield this.one("SELECT * FROM drafts WHERE id=?", did);
      if (!d || d.actor_id !== user.id) fail(403, "DRAFT_ACCESS", "Rascunho não autorizado.");
      yield this.member(user, d.session_id);
      const run = yield this.one("SELECT id,config_snapshot FROM runs WHERE session_id=?", d.session_id);
      if (!run || JSON.parse(run.config_snapshot).observePause !== true)
        fail(409, "OBSERVATION_DISABLED", "Registro não ativado para esta execução experimental.");
      const entity = hash(JSON.stringify([user.id, did, body.visitId]));
      const opened = yield this.one("SELECT payload FROM audit_events WHERE session_id=? AND entity_id=? AND action=?",
        d.session_id, entity, "pause.opened");
      const closed = yield this.one("SELECT payload FROM audit_events WHERE session_id=? AND entity_id=? AND action=?",
        d.session_id, entity, "pause.closed");
      if (body.event === "opened" && opened) return { recorded: true };
      if (body.event !== "opened" && closed) {
        if (JSON.parse(closed.payload).event !== body.event)
          fail(409, "OBSERVATION_CLOSED", "Visita já encerrada com outra ação.");
        return { recorded: true };
      }
      if (body.event === "opened" && (d.status !== "pause" || d.ready_at === null))
        fail(409, "STAGE", "Abra o registro somente na etapa de pausa.");
      if (body.event !== "opened" && !opened)
        fail(409, "OBSERVATION_ORDER", "A abertura ainda não foi registrada.");
      if (body.event === "continue" && this.now() < JSON.parse(opened.payload).readyAtAtOpen)
        fail(409, "PAUSE", "A pausa do servidor ainda não terminou.");
      const context = opened ? JSON.parse(opened.payload) : {
        version: "justec-pause-observation/1.0.0", draftId: did, visitId: body.visitId,
        runId: run.id, evaluationId: d.evaluation_id, readyAtAtOpen: d.ready_at,
      };
      yield this.audit(d.session_id, user.id, body.event === "opened" ? "pause.opened" : "pause.closed", entity,
        { ...context, event: body.event });
      return { recorded: true };
    }.bind(this)));
  });
  Lab.prototype.pauseExposure = flow(function* (user, sid) {
    yield this.member(user, sid, ["admin", "researcher"]);
    const events = yield this.all(
      "SELECT a.payload,a.created_at FROM audit_events a LEFT JOIN runs r ON r.session_id=a.session_id WHERE (a.session_id=? OR r.parent_session_id=?) AND a.action IN ('pause.opened','pause.closed') ORDER BY a.created_at,a.id",
      sid, sid,
    );
    return summarizeExposure(events);
  });
}
module.exports = { attachPauseObservations, summarizeExposure, summarizeVisits };
