"use strict";
// Apenas descrição das jornadas fictícias; nunca participa da decisão de risco.
const STATUSES = new Set(["not_started", "review", "verification", "pause", "completed", "blocked", "cancelled"]);
function summarizeJourneys(rows) {
  if (!Array.isArray(rows)) throw new TypeError("Jornadas devem ser uma lista.");
  const summary = {
    assigned: rows.length,
    notStarted: 0,
    inProgress: 0,
    completed: 0,
    blocked: 0,
    cancelled: 0,
    reconsidered: 0,
    byLabel: Object.fromEntries(["legitimate", "fraudulent"].map(label => [label, {
      assigned: 0, notStarted: 0, inProgress: 0, completed: 0, blocked: 0, cancelled: 0,
    }])),
  };
  const seen = new Set();
  for (const row of rows) {
    if (!row || typeof row.runId !== "string" || !row.runId ||
        typeof row.operationId !== "string" || !row.operationId ||
        !["legitimate", "fraudulent"].includes(row.label) ||
        !STATUSES.has(row.status) || typeof row.reconsidered !== "boolean")
      throw new TypeError("Jornada experimental inválida.");
    const key = JSON.stringify([row.runId, row.operationId]);
    if (seen.has(key)) throw new TypeError("Operação experimental duplicada.");
    seen.add(key);
    const outcome = row.status === "not_started" ? "notStarted"
      : ["review", "verification", "pause"].includes(row.status) ? "inProgress"
      : row.status;
    summary[outcome]++;
    summary.byLabel[row.label].assigned++;
    summary.byLabel[row.label][outcome]++;
    if (row.reconsidered) summary.reconsidered++;
  }
  return {
    ...summary,
    completionRate: rows.length ? summary.completed / rows.length : null,
    cancellationRate: rows.length ? summary.cancelled / rows.length : null,
    resolutionRate: rows.length ? (summary.completed + summary.blocked + summary.cancelled) / rows.length : null,
  };
}
module.exports = { summarizeJourneys };
