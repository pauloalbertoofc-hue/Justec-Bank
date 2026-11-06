const { flow, collect, wrapMethods } = require("./flow.cjs");
const { fail, id, hash, text, cents, exact } = require("./security.cjs");
const guard = require("./guard.cjs");
const { PROFILES } = require("./lab.cjs");
function normalizeBaseline(input, allowedProfiles = PROFILES) {
  exact(input, ["accounts", "history", "operations"]);
  if (
    !Array.isArray(input.accounts) ||
    input.accounts.length < 2 ||
    input.accounts.length > 20 ||
    !Array.isArray(input.operations) ||
    input.operations.length < 1 ||
    input.operations.length > 50
  )
    fail(400, "SCENARIO", "Use 2 a 20 contas e 1 a 50 operações.");
  const slots = new Set();
  const accounts = input.accounts.map((a) => {
    exact(a, ["slot", "name", "profile", "initialCents", "limitCents"]);
    const slot = text(a.slot, "Identificador", 1, 30);
    if (slots.has(slot)) fail(400, "SCENARIO", "Identificadores repetidos.");
    slots.add(slot);
    const profile = a.profile || allowedProfiles[0];
    if (!allowedProfiles.includes(profile))
      fail(400, "PROFILE", "Perfil inválido.");
    return {
      slot,
      name: text(a.name, "Titular fictício", 2, 80),
      profile,
      initialCents: cents(a.initialCents, true),
      limitCents: cents(a.limitCents || 200000),
    };
  });
  const normalizeOperation = (o, index, isHistory) => {
    exact(
      o,
      isHistory
        ? ["from", "to", "amountCents"]
        : ["id", "from", "to", "amountCents", "answers", "truth"],
    );
    if (!slots.has(o.from) || !slots.has(o.to) || o.from === o.to)
      fail(400, "SCENARIO", "Origem/destino inválidos.");
    const normalized = {
      id: isHistory
        ? `history-${index}`
        : text(o.id || `operation-${index}`, "Operação", 1, 40),
      from: o.from,
      to: o.to,
      amountCents: cents(o.amountCents),
    };
    if (!isHistory) {
      normalized.answers = guard.answers(o.answers || {});
      if (!["legitimate", "fraudulent"].includes(o.truth))
        fail(400, "SCENARIO", "Rótulo experimental inválido.");
      normalized.truth = o.truth;
    }
    return normalized;
  };
  if (
    input.history !== undefined &&
    (!Array.isArray(input.history) || input.history.length > 100)
  )
    fail(400, "SCENARIO", "Histórico-base inválido.");
  const operations = input.operations.map((o, i) =>
    normalizeOperation(o, i, false),
  );
  if (new Set(operations.map((o) => o.id)).size !== operations.length)
    fail(400, "SCENARIO", "Operações repetidas.");
  const history = (input.history || []).map((o, i) =>
    normalizeOperation(o, i, true),
  );
  const balances = Object.fromEntries(
    accounts.map((a) => [a.slot, a.initialCents]),
  );
  for (const h of history) {
    if (balances[h.from] < h.amountCents)
      fail(400, "SCENARIO", "Histórico-base geraria saldo negativo.");
    balances[h.from] -= h.amountCents;
    balances[h.to] += h.amountCents;
    if (balances[h.to] > 1000000000)
      fail(400, "SCENARIO", "Saldo-base excedido.");
  }
  return {
    accounts,
    history,
    operations,
  };
}
function publicBaseline(base) {
  return {
    ...base,
    operations: base.operations.map(({ truth, ...operation }) => operation),
  };
}
function attachResearch(Lab) {
  Lab.prototype.scenarios = flow(function* (user, sid) {
    yield this.member(user, sid, ["admin", "researcher"]);
    return yield this.all(
      "SELECT id,name,baseline_hash baselineHash,created_at createdAt FROM scenarios WHERE session_id=? ORDER BY created_at DESC",
      sid,
    );
  });
  Lab.prototype.createScenario = flow(function* (user, sid, body) {
    exact(body, ["name", "baseline"]);
    yield this.member(user, sid, ["admin", "researcher"]);
    yield this.active(sid);
    const baseline = normalizeBaseline(
        body.baseline,
        JSON.parse(
          (yield this.one("SELECT config FROM sessions WHERE id=?", sid))
            .config,
        ).profiles,
      ),
      visible = publicBaseline(baseline),
      baselineHash = hash(
        JSON.stringify({
          accounts: visible.accounts,
          history: visible.history,
        }),
      );
    return yield this.tx(
      flow(
        function* () {
          const scenarioId = id();
          yield this.run(
            "INSERT INTO scenarios VALUES(?,?,?,?,?,?,?)",
            scenarioId,
            sid,
            text(body.name, "Cenário", 3, 80),
            JSON.stringify(visible),
            baselineHash,
            user.id,
            this.now(),
          );
          for (const op of baseline.operations)
            yield this.run(
              "INSERT INTO ground_truth VALUES(?,?,?)",
              scenarioId,
              op.id,
              op.truth,
            );
          yield this.audit(sid, user.id, "scenario.created", scenarioId, {
            baselineHash,
            operations: baseline.operations.length,
          });
          return {
            id: scenarioId,
            baselineHash,
          };
        }.bind(this),
      ),
    );
  });
  Lab.prototype.startRun = flow(function* (
    user,
    sid,
    scenarioId,
    body,
    originalSettings = null,
  ) {
    exact(body, ["condition", "pauseMs", "owners"]);
    yield this.member(user, sid, ["admin", "researcher"]);
    yield this.active(sid);
    const scenario = yield this.one(
      "SELECT * FROM scenarios WHERE id=? AND session_id=?",
      scenarioId,
      sid,
    );
    if (!scenario) fail(404, "SCENARIO", "Cenário inexistente nesta sessão.");
    const parent = yield this.one(
        "SELECT config FROM sessions WHERE id=?",
        sid,
      ),
      settings = guard.config(
        originalSettings || {
          ...JSON.parse(parent.config),
          mode: body.condition || "integrated",
          ...(body.pauseMs !== undefined
            ? {
                pauseMs: body.pauseMs,
              }
            : {}),
        },
      );
    const baseline = JSON.parse(scenario.baseline),
      owners = body.owners || {};
    if (
      !owners ||
      typeof owners !== "object" ||
      Array.isArray(owners) ||
      Object.keys(owners).some(
        (slot) => !baseline.accounts.some((a) => a.slot === slot),
      )
    )
      fail(400, "OWNERS", "Vínculos inválidos.");
    for (const owner of Object.values(owners))
      yield this.member(
        {
          id: owner,
        },
        sid,
      );
    return yield this.tx(
      flow(
        function* () {
          const newSession = yield this._newSession(
            user,
            `${scenario.name} · ${settings.mode}`,
            settings,
            sid,
          );
          for (const m of yield this.all(
            "SELECT * FROM memberships WHERE session_id=?",
            sid,
          ))
            yield this.run(
              "INSERT OR IGNORE INTO memberships VALUES(?,?,?,?)",
              newSession,
              m.user_id,
              m.role,
              this.now(),
            );
          const runId = id();
          const accounts = {};
          for (const spec of baseline.accounts) {
            const owner = {
              id: owners[spec.slot] || user.id,
            };
            const aid = yield this._account(
              owner,
              newSession,
              {
                name: spec.name,
                profile: spec.profile,
              },
              spec.initialCents,
              user,
            );
            yield this.run(
              "UPDATE accounts SET limit_cents=? WHERE id=?",
              spec.limitCents,
              aid,
            );
            accounts[spec.slot] = aid;
          }
          const baselineHash = hash(
            JSON.stringify([
              scenario.baseline_hash,
              baseline.accounts.map((a) => [a.slot, owners[a.slot] || user.id]),
            ]),
          );
          yield this.run(
            "INSERT INTO runs VALUES(?,?,?,?,?,?,?,?,?,?)",
            runId,
            sid,
            newSession,
            scenarioId,
            baselineHash,
            settings.mode,
            JSON.stringify(settings),
            hash(JSON.stringify(settings)),
            JSON.stringify(accounts),
            this.now(),
          );
          for (const [index, h] of baseline.history.entries())
            yield this._post(
              user,
              newSession,
              accounts[h.from],
              accounts[h.to],
              h.amountCents,
              "scenario_history",
              `baseline:${runId}:${index}`,
              null,
              null,
              "Histórico sintético de cenário: estado-base reproduzível, não dado externo.",
            );
          for (const op of baseline.operations)
            yield this.run(
              "INSERT INTO run_operations VALUES(?,?,?,?,?,?,?)",
              id(),
              runId,
              op.id,
              accounts[op.from],
              accounts[op.to],
              op.amountCents,
              JSON.stringify(op.answers),
            );
          yield this.audit(newSession, user.id, "run.started", runId, {
            parentSessionId: sid,
            baselineHash,
            condition: settings.mode,
            settings,
          });
          yield this.audit(sid, user.id, "experiment.started", runId, {
            sessionId: newSession,
            baselineHash,
          });
          return {
            id: runId,
            sessionId: newSession,
            baselineHash,
            condition: settings.mode,
          };
        }.bind(this),
      ),
    );
  });
  Lab.prototype.runs = flow(function* (user, sid) {
    yield this.member(user, sid, ["admin", "researcher"]);
    return yield collect(
      (yield this.all(
        "SELECT r.*,s.name,s.status FROM runs r JOIN sessions s ON s.id=r.session_id WHERE r.parent_session_id=? ORDER BY r.created_at DESC",
        sid,
      )).map(
        flow(
          function* (r) {
            return {
              ...r,
              operations: yield this.all(
                "SELECT o.*,g.label FROM run_operations o JOIN runs r ON r.id=o.run_id JOIN ground_truth g ON g.scenario_id=r.scenario_id AND g.operation_id=o.operation_id WHERE o.run_id=?",
                r.id,
              ),
            };
          }.bind(this),
        ),
      ),
    );
  });
  Lab.prototype.repeatRun = flow(function* (user, runId) {
    const r = yield this.one("SELECT * FROM runs WHERE id=?", runId);
    if (!r) fail(404, "RUN", "Execução inexistente.");
    yield this.member(user, r.parent_session_id, ["admin", "researcher"]);
    const conf = JSON.parse(
      (yield this.one("SELECT config FROM sessions WHERE id=?", r.session_id))
        .config,
    );
    const owners = Object.fromEntries(
      yield collect(
        Object.entries(JSON.parse(r.account_map)).map(
          flow(
            function* ([slot, aid]) {
              return [
                slot,
                (yield this.one(
                  "SELECT owner_id FROM accounts WHERE id=?",
                  aid,
                )).owner_id,
              ];
            }.bind(this),
          ),
        ),
      ),
    );
    return yield this.startRun(
      user,
      r.parent_session_id,
      r.scenario_id,
      {
        condition: r.condition,
        pauseMs: conf.pauseMs,
        owners,
      },
      JSON.parse(r.config_snapshot),
    );
  });
  Lab.prototype.tasks = flow(function* (user, sid) {
    yield this.member(user, sid);
    return yield this.all(
      "SELECT o.id,o.amount_cents amountCents,o.source_id sourceId,a.name source,t.name destination,(SELECT value FROM pix_keys WHERE account_id=t.id AND active=1 LIMIT 1) key,d.id draftId,d.status FROM run_operations o JOIN runs r ON r.id=o.run_id JOIN accounts a ON a.id=o.source_id JOIN accounts t ON t.id=o.destination_id LEFT JOIN drafts d ON d.operation_id=o.id WHERE r.session_id=? AND a.owner_id=?",
      sid,
      user.id,
    );
  });
  Lab.prototype.taskDraft = flow(function* (user, operationId, body = {}) {
    exact(body, ["requestContext"]);
    if (
      body.requestContext !== undefined &&
      typeof body.requestContext !== "boolean"
    )
      fail(400, "CONTEXT", "Pedido contextual inválido.");
    const o = yield this.one(
      "SELECT o.*,r.session_id FROM run_operations o JOIN runs r ON r.id=o.run_id WHERE o.id=?",
      operationId,
    );
    if (!o) fail(404, "TASK", "Operação inexistente.");
    yield this.mine(user, o.source_id);
    yield this.member(user, o.session_id);
    const existing = yield this.one(
      "SELECT id FROM drafts WHERE operation_id=?",
      o.id,
    );
    if (existing) return yield this.draft(user, existing.id);
    const key = yield this.one(
      "SELECT value FROM pix_keys WHERE account_id=? AND active=1",
      o.destination_id,
    );
    if (!key) fail(409, "KEY", "Destinatário sem chave ativa.");
    return yield this.createDraft(
      user,
      o.session_id,
      {
        sourceId: o.source_id,
        key: key.value,
        amountCents: o.amount_cents,
        requestContext: body.requestContext === true,
      },
      o.id,
    );
  });
  Lab.prototype.snapshot = flow(function* (user, sid, body) {
    exact(body, ["name"]);
    yield this.member(user, sid, ["admin", "researcher"]);
    return yield this.tx(
      flow(
        function* () {
          const accounts = yield collect(
            (yield this.all(
              "SELECT * FROM accounts WHERE session_id=? AND kind='virtual' ORDER BY id",
              sid,
            )).map(
              flow(
                function* (a) {
                  return {
                    ...a,
                    balanceCents: yield this.balance(a.id),
                    keys: yield this.all(
                      "SELECT value FROM pix_keys WHERE account_id=? AND active=1",
                      a.id,
                    ),
                    history: (yield this.all(
                      "SELECT destination_id recipient_id,amount_cents,'ledger:'||id provenance FROM transfers WHERE source_id=? AND kind IN ('pix','scenario_history')",
                      a.id,
                    )).concat(
                      yield this.all(
                        "SELECT recipient_id,amount_cents,provenance FROM account_observations WHERE account_id=?",
                        a.id,
                      ),
                    ),
                    attempts: (yield this.all(
                      "SELECT destination_id,'draft:'||id provenance FROM drafts WHERE source_id=? AND status='blocked'",
                      a.id,
                    )).concat(
                      yield this.all(
                        "SELECT destination_id,provenance FROM attempt_observations WHERE source_id=?",
                        a.id,
                      ),
                    ),
                  };
                }.bind(this),
              ),
            ),
          );
          const payload = {
            accounts,
            config: JSON.parse(
              (yield this.one("SELECT config FROM sessions WHERE id=?", sid))
                .config,
            ),
            members: yield this.all(
              "SELECT user_id,role FROM memberships WHERE session_id=? ORDER BY user_id",
              sid,
            ),
          };
          const snapshotId = id(),
            snapshotHash = hash(JSON.stringify(payload));
          yield this.run(
            "INSERT INTO snapshots VALUES(?,?,?,?,?,?,?)",
            snapshotId,
            sid,
            text(body.name, "Estado-base", 3, 80),
            JSON.stringify(payload),
            snapshotHash,
            user.id,
            this.now(),
          );
          yield this.audit(sid, user.id, "snapshot.created", snapshotId, {
            snapshotHash,
          });
          return {
            id: snapshotId,
            snapshotHash,
          };
        }.bind(this),
      ),
    );
  });
  Lab.prototype.snapshots = flow(function* (user, sid) {
    yield this.member(user, sid, ["admin", "researcher"]);
    return yield this.all(
      "SELECT id,name,snapshot_hash snapshotHash,created_at createdAt FROM snapshots WHERE session_id=? ORDER BY created_at DESC",
      sid,
    );
  });
  Lab.prototype.restore = flow(function* (user, snapshotId, body) {
    exact(body, ["name", "archiveSource"]);
    const snap = yield this.one(
      "SELECT * FROM snapshots WHERE id=?",
      snapshotId,
    );
    if (!snap) fail(404, "SNAPSHOT", "Estado-base inexistente.");
    yield this.member(user, snap.session_id, ["admin", "researcher"]);
    if (
      body.archiveSource !== undefined &&
      typeof body.archiveSource !== "boolean"
    )
      fail(400, "SNAPSHOT", "Arquivamento deve ser verdadeiro ou falso.");
    if (body.archiveSource) yield this.member(user, snap.session_id, ["admin"]);
    const payload = JSON.parse(snap.payload);
    return yield this.tx(
      flow(
        function* () {
          const sid = yield this._newSession(
            user,
            text(body.name || `${snap.name} · restauração`, "Nome", 3, 80),
            payload.config,
            snap.session_id,
          );
          for (const m of payload.members)
            yield this.run(
              "INSERT OR IGNORE INTO memberships VALUES(?,?,?,?)",
              sid,
              m.user_id,
              m.role,
              this.now(),
            );
          const map = {};
          for (const a of payload.accounts) {
            const aid = yield this._account(
              {
                id: a.owner_id,
              },
              sid,
              {
                name: a.name,
                profile: a.profile,
              },
              0,
              user,
            );
            map[a.id] = aid;
            yield this.run(
              "UPDATE accounts SET status=?,limit_cents=? WHERE id=?",
              a.status,
              a.limit_cents,
              aid,
            );
            yield this.run(
              "UPDATE pix_keys SET active=0,version=version+1 WHERE account_id=?",
              aid,
            );
            for (const key of a.keys)
              yield this.run(
                "INSERT INTO pix_keys VALUES(?,?,?,?,?,?,?)",
                id(),
                sid,
                aid,
                key.value,
                1,
                1,
                this.now(),
              );
            if (a.balanceCents) {
              const treasury = yield this.one(
                "SELECT id FROM accounts WHERE session_id=? AND kind='treasury'",
                sid,
              );
              yield this._post(
                user,
                sid,
                treasury.id,
                aid,
                a.balanceCents,
                "restoration",
                `restore:${aid}`,
                null,
                null,
                `Restauração do estado-base ${snap.id}; histórico original preservado.`,
              );
            }
          }
          for (const a of payload.accounts) {
            for (const h of a.history)
              yield this.run(
                "INSERT INTO account_observations VALUES(?,?,?,?,?,?,?)",
                id(),
                sid,
                map[a.id],
                map[h.recipient_id],
                h.amount_cents,
                `snapshot:${snap.id}/${h.provenance}`,
                this.now(),
              );
            for (const h of a.attempts)
              yield this.run(
                "INSERT INTO attempt_observations VALUES(?,?,?,?,?,?)",
                id(),
                sid,
                map[a.id],
                map[h.destination_id],
                `snapshot:${snap.id}/${h.provenance}`,
                this.now(),
              );
          }
          if (body.archiveSource) {
            yield this.run(
              "UPDATE sessions SET status='archived',config_version=config_version+1 WHERE id=?",
              snap.session_id,
            );
            yield this.audit(
              snap.session_id,
              user.id,
              "session.archived_for_reset",
              sid,
              {
                snapshotId: snap.id,
              },
            );
          }
          yield this.audit(sid, user.id, "snapshot.restored", sid, {
            snapshotId: snap.id,
            snapshotHash: snap.snapshot_hash,
          });
          return yield this.session(user, sid);
        }.bind(this),
      ),
    );
  });
  Lab.prototype.note = flow(function* (user, sid, body) {
    exact(body, ["runId", "note"]);
    yield this.member(user, sid, ["admin", "researcher"]);
    if (
      body.runId &&
      !(yield this.one(
        "SELECT 1 FROM runs WHERE id=? AND (parent_session_id=? OR session_id=?)",
        body.runId,
        sid,
        sid,
      ))
    )
      fail(403, "RUN", "Execução fora da sessão.");
    return yield this.tx(
      flow(
        function* () {
          const nid = id(),
            note = text(body.note, "Observação", 3, 2000);
          yield this.run(
            "INSERT INTO observations VALUES(?,?,?,?,?,?)",
            nid,
            sid,
            user.id,
            body.runId || null,
            note,
            this.now(),
          );
          yield this.audit(sid, user.id, "research.observation", nid, {
            runId: body.runId || null,
          });
          return {
            id: nid,
          };
        }.bind(this),
      ),
    );
  });
  Lab.prototype.metrics = flow(function* (user, sid) {
    yield this.member(user, sid, ["admin", "researcher"]);
    const rows = yield collect(
      (yield this.all(
        `SELECT r.id runId,r.condition,r.config_hash configHash,r.baseline_hash baselineHash,o.operation_id operationId,g.label,d.id draftId,d.status,d.created_at,d.finished_at,e.decision
  FROM runs r JOIN run_operations o ON o.run_id=r.id JOIN ground_truth g ON g.scenario_id=r.scenario_id AND g.operation_id=o.operation_id
  LEFT JOIN drafts d ON d.operation_id=o.id LEFT JOIN evaluations e ON e.id=d.evaluation_id WHERE r.parent_session_id=? ORDER BY r.created_at,o.id`,
        sid,
      )).map(
        flow(
          function* (r) {
            let status = r.status,
              latest = r.draftId
                ? yield this.one("SELECT * FROM drafts WHERE id=?", r.draftId)
                : null;
            let reconsidered = status === "cancelled";
            const revisions = [];
            while (latest) {
              const next = yield this.one(
                "SELECT * FROM drafts WHERE revision_of=? AND clearance_id IS NULL",
                latest.id,
              );
              if (!next) break;
              revisions.push(next.id);
              latest = next;
              reconsidered = true;
            }
            if (latest && r.status !== "blocked") status = latest.status;
            const latestEvaluation = latest?.evaluation_id
              ? yield this.one(
                  "SELECT decision FROM evaluations WHERE id=?",
                  latest.evaluation_id,
                )
              : null;
            const decision =
              r.status === "blocked"
                ? r.decision
                  ? JSON.parse(r.decision)
                  : null
                : latestEvaluation
                  ? JSON.parse(latestEvaluation.decision)
                  : r.decision
                    ? JSON.parse(r.decision)
                    : null;
            return {
              runId: r.runId,
              condition: r.condition,
              configHash: r.configHash,
              baselineHash: r.baselineHash,
              operationId: r.operationId,
              label: r.label,
              draftId: r.draftId || null,
              status: status || "not_started",
              reconsidered,
              revisions,
              action: decision?.action || null,
              codes: decision?.codes || [],
              durationMs:
                latest?.finished_at && r.created_at
                  ? latest.finished_at - r.created_at
                  : null,
            };
          }.bind(this),
        ),
      ),
    );
    const groups = new Map();
    for (const row of rows) {
      const k = `${row.baselineHash}/${row.configHash}`;
      if (!groups.has(k))
        groups.set(k, {
          baselineHash: row.baselineHash,
          condition: row.condition,
          configHash: row.configHash,
          TP: 0,
          FP: 0,
          TN: 0,
          FN: 0,
          pending: 0,
          cancelled: 0,
          reconsidered: 0,
          durations: [],
        });
      const g = groups.get(k);
      if (row.reconsidered) g.reconsidered++;
      if (row.status === "cancelled") {
        g.cancelled++;
        continue;
      }
      if (!["blocked", "completed"].includes(row.status)) {
        g.pending++;
        continue;
      }
      const positive = row.status === "blocked";
      g[
        row.label === "fraudulent"
          ? positive
            ? "TP"
            : "FN"
          : positive
            ? "FP"
            : "TN"
      ]++;
      if (row.durationMs !== null) g.durations.push(row.durationMs);
    }
    return {
      definition:
        "Positivo = operação interrompida. Só operações concluídas ou bloqueadas entram na matriz; alertas, pendentes e canceladas são separados. Não é estimativa de eficácia de mercado.",
      rows,
      groups: [...groups.values()].map(({ durations, ...g }) => ({
        ...g,
        n: g.TP + g.FP + g.TN + g.FN,
        sensitivity: g.TP + g.FN ? g.TP / (g.TP + g.FN) : null,
        falsePositiveRate: g.FP + g.TN ? g.FP / (g.FP + g.TN) : null,
        meanDurationMs: durations.length
          ? durations.reduce((a, b) => a + b, 0) / durations.length
          : null,
        warning:
          "Amostra experimental; sem inferência estatística ou validação de eficácia.",
      })),
    };
  });
  Lab.prototype.overview = flow(function* (user, sid) {
    yield this.member(user, sid, ["admin", "researcher"]);
    return {
      session: yield this.session(user, sid),
      members: yield this.members(user, sid),
      accounts: yield this.all(
        "SELECT a.id,a.name,a.owner_id ownerId,a.profile,a.status,a.limit_cents limitCents,COALESCE(SUM(l.delta_cents),0) balanceCents FROM accounts a LEFT JOIN ledger_entries l ON l.account_id=a.id WHERE a.session_id=? AND a.kind='virtual' GROUP BY a.id",
        sid,
      ),
      operations: yield this.all(
        "SELECT id,kind,amount_cents amountCents,created_at createdAt FROM transfers WHERE session_id=? ORDER BY created_at DESC",
        sid,
      ),
      drafts: yield this.all(
        "SELECT id,status,clearance_id clearanceId,operation_id operationId,amount_cents amountCents,created_at createdAt FROM drafts WHERE session_id=? ORDER BY created_at DESC",
        sid,
      ),
      participantFeedback: yield this.all(
        "SELECT draft_id draftId,understanding,intention,created_at createdAt FROM participant_feedback WHERE session_id=? ORDER BY created_at",
        sid,
      ),
      reviews: yield this.reviews(user, sid),
      indicatorDistribution: yield this.all(
        "SELECT j.value AS code,COUNT(*) evaluations FROM evaluations e,json_each(json_extract(e.decision,'$.codes')) j WHERE e.session_id=? GROUP BY j.value",
        sid,
      ),
      evaluations: (yield this.all(
        "SELECT id,draft_id draftId,phase,evidence,decision,rules_version rulesVersion,created_at createdAt FROM evaluations WHERE session_id=? ORDER BY created_at",
        sid,
      )).map((e) => ({
        ...e,
        evidence: JSON.parse(e.evidence),
        decision: JSON.parse(e.decision),
      })),
      notes: yield this.all(
        "SELECT id,run_id runId,note,created_at createdAt FROM observations WHERE session_id=? ORDER BY created_at DESC",
        sid,
      ),
      audit: yield this.all(
        "SELECT id,actor_id actorId,action,entity_id entityId,payload,created_at createdAt FROM audit_events WHERE session_id=? ORDER BY created_at DESC",
        sid,
      ),
      metrics: yield this.metrics(user, sid),
    };
  });
  Lab.prototype.exportResearch = flow(function* (user, sid, format = "json") {
    const overview = yield this.overview(user, sid);
    yield this.audit(sid, user.id, "research.exported", sid, {
      format,
    });
    if (format === "json")
      return {
        contentType: "application/json",
        body: JSON.stringify(
          {
            simulation: true,
            exportVersion: "justec-research/1.0.0",
            generatedAt: new Date(this.now()).toISOString(),
            ...overview,
            scenarios: yield this.all(
              "SELECT id,name,baseline,baseline_hash FROM scenarios WHERE session_id=?",
              sid,
            ),
            runs: yield this.runs(user, sid),
            executions: yield collect(
              (yield this.runs(user, sid)).map(
                flow(
                  function* (r) {
                    return yield this.overview(user, r.session_id);
                  }.bind(this),
                ),
              ),
            ),
          },
          null,
          2,
        ),
      };
    if (format !== "csv") fail(400, "FORMAT", "Use json ou csv.");
    const fields = [
      "runId",
      "condition",
      "configHash",
      "baselineHash",
      "operationId",
      "label",
      "status",
      "action",
      "durationMs",
    ];
    const cell = (value) => {
      let s = String(value ?? "");
      if (typeof value === "string" && /^[\s]*[=+@-]/.test(s)) s = "'" + s;
      return '"' + s.replaceAll('"', '""') + '"';
    };
    return {
      contentType: "text/csv; charset=utf-8",
      body: [
        fields.map(cell).join(","),
        ...overview.metrics.rows.map((row) =>
          fields.map((key) => cell(row[key])).join(","),
        ),
      ].join("\r\n"),
    };
  });
}
const BASE_ACCOUNTS = [
  {
    slot: "ana",
    name: "Ana — fictícia",
    profile: "person",
    initialCents: 200000,
    limitCents: 200000,
  },
  {
    slot: "robson",
    name: "Robson — fictício",
    profile: "person",
    initialCents: 100000,
    limitCents: 200000,
  },
];
function examples() {
  return [
    [
      "Transferência legítima",
      "legitimate",
      {
        identity: "yes",
        urgency: "no",
        advance: "no",
        ignore: "no",
      },
    ],
    [
      "Pressão e pagamento antecipado",
      "fraudulent",
      {
        identity: "no",
        urgency: "yes",
        advance: "yes",
        ignore: "yes",
      },
    ],
    [
      "Falso positivo contextual",
      "legitimate",
      {
        identity: "no",
        urgency: "yes",
        advance: "yes",
        ignore: "yes",
      },
    ],
    [
      "Fraude sem indícios observáveis",
      "fraudulent",
      {
        identity: "yes",
        urgency: "no",
        advance: "no",
        ignore: "no",
      },
    ],
  ].map(([name, truth, answers]) => ({
    name,
    baseline: {
      accounts: BASE_ACCOUNTS.map((a) => ({
        ...a,
      })),
      history: [],
      operations: [
        {
          id: "pix-1",
          from: "ana",
          to: "robson",
          amountCents: 25000,
          truth,
          answers,
        },
      ],
    },
  }));
}
module.exports = {
  attachResearch,
  normalizeBaseline,
  examples,
};
