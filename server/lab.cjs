const { flow, collect, wrapMethods } = require("./flow.cjs");
const { atomic } = require("./db.cjs");
const { fail, id, hash, token, text, cents, exact } = require("./security.cjs");
const guard = require("./guard.cjs");
const { DEFAULT_PROFILES: PROFILES } = require("./profiles.cjs");
class Lab {
  constructor(db, { now = () => Date.now() } = {}) {
    this.db = db;
    this.now = now;
  }
  *one(sql, ...args) {
    return yield this.db.prepare(sql).get(...args);
  }
  *all(sql, ...args) {
    return yield this.db.prepare(sql).all(...args);
  }
  *run(sql, ...args) {
    return yield this.db.prepare(sql).run(...args);
  }
  *tx(fn) {
    return yield atomic(this.db, fn);
  }
  *audit(session, actor, action, entity, payload = {}) {
    yield this.run(
      "INSERT INTO audit_events VALUES(?,?,?,?,?,?,?)",
      id(),
      session,
      actor,
      action,
      entity,
      JSON.stringify(payload),
      this.now(),
    );
  }
  *member(user, sid, roles) {
    const row = yield this.one(
      "SELECT m.*,s.status FROM memberships m JOIN sessions s ON s.id=m.session_id WHERE m.user_id=? AND m.session_id=?",
      user.id,
      sid,
    );
    if (!row || (roles && !roles.includes(row.role)))
      fail(403, "FORBIDDEN", "Sem permissão nesta sessão.");
    return row;
  }
  *active(sid) {
    const session = yield this.one("SELECT * FROM sessions WHERE id=?", sid);
    if (!session || session.status !== "active")
      fail(
        409,
        "SESSION_INACTIVE",
        "Sessão arquivada ou encerrada: somente consulta.",
      );
    return session;
  }
  *mine(user, accountId) {
    const account = yield this.one(
      "SELECT * FROM accounts WHERE id=? AND kind='virtual'",
      accountId,
    );
    if (!account || account.owner_id !== user.id)
      fail(403, "ACCOUNT_ACCESS", "Conta não autorizada.");
    yield this.member(user, account.session_id);
    return account;
  }
  *balance(accountId) {
    return (yield this.one(
      "SELECT COALESCE(SUM(delta_cents),0) cents FROM ledger_entries WHERE account_id=?",
      accountId,
    )).cents;
  }
  *sessionList(user) {
    return yield this.all(
      "SELECT s.id,s.name,s.status,s.created_at,m.role,s.source_id FROM sessions s JOIN memberships m ON m.session_id=s.id WHERE m.user_id=? ORDER BY s.created_at DESC",
      user.id,
    );
  }
  *session(user, sid) {
    const membership = yield this.member(user, sid);
    const s = yield this.one("SELECT * FROM sessions WHERE id=?", sid);
    return {
      id: s.id,
      name: s.name,
      status: s.status,
      role: membership.role,
      configVersion: s.config_version,
      config: JSON.parse(s.config),
      createdAt: s.created_at,
      sourceId: s.source_id,
    };
  }
  *_newSession(user, name, settings, sourceId = null) {
    const sid = id();
    yield this.run(
      "INSERT INTO sessions VALUES(?,?,?,?,?,?,?,?)",
      sid,
      name,
      user.id,
      "active",
      JSON.stringify(guard.config(settings)),
      1,
      sourceId,
      this.now(),
    );
    yield this.run(
      "INSERT INTO memberships VALUES(?,?,?,?)",
      sid,
      user.id,
      "admin",
      this.now(),
    );
    yield this.run(
      "INSERT INTO accounts VALUES(?,?,?,?,?,?,?,?,?)",
      id(),
      sid,
      null,
      "Tesouraria virtual",
      "system",
      "treasury",
      "active",
      1000000000,
      this.now(),
    );
    yield this.audit(sid, user.id, "session.created", sid, {
      sourceId,
      config: guard.config(settings),
    });
    return sid;
  }
  *createSession(user, body) {
    exact(body, ["name", "config"]);
    if (
      (yield this.one("SELECT global_role FROM users WHERE id=?", user.id))
        ?.global_role !== "admin"
    )
      fail(
        403,
        "FORBIDDEN",
        "Somente administrador inicial pode criar uma sessão principal.",
      );
    return yield this.tx(
      flow(
        function* () {
          return yield this.session(
            user,
            yield this._newSession(
              user,
              text(body.name, "Nome", 3, 80),
              body.config,
            ),
          );
        }.bind(this),
      ),
    );
  }
  *updateSession(user, sid, body) {
    exact(body, ["status", "config"]);
    yield this.member(user, sid, ["admin"]);
    return yield this.tx(
      flow(
        function* () {
          const old = yield this.one("SELECT * FROM sessions WHERE id=?", sid);
          if (
            body.config &&
            (yield this.one("SELECT 1 FROM runs WHERE session_id=?", sid))
          )
            fail(
              409,
              "RUN_CONFIG_FROZEN",
              "Crie uma nova execução para mudar a condição experimental.",
            );
          const status = body.status ?? old.status;
          if (
            !["active", "archived", "closed"].includes(status) ||
            (old.status === "closed" && status !== "closed")
          )
            fail(
              400,
              "STATUS",
              "Estado inválido; sessão encerrada não reabre.",
            );
          const previousConfig = JSON.parse(old.config);
          if (
            body.config !== undefined &&
            (!body.config ||
              typeof body.config !== "object" ||
              Array.isArray(body.config))
          )
            fail(400, "CONFIG", "Configuração inválida.");
          const conf = body.config
            ? guard.config({
                ...previousConfig,
                ...body.config,
                ...(body.config.rules
                  ? {
                      rules: {
                        ...previousConfig.rules,
                        ...body.config.rules,
                      },
                    }
                  : {}),
              })
            : previousConfig;
          const usedProfiles = yield this.all(
            "SELECT DISTINCT profile FROM accounts WHERE session_id=? AND kind='virtual'",
            sid,
          );
          if (usedProfiles.some((a) => !conf.profiles.includes(a.profile)))
            fail(
              409,
              "PROFILE_IN_USE",
              "Não remova um perfil usado por contas existentes.",
            );
          yield this.run(
            "UPDATE sessions SET status=?,config=?,config_version=config_version+1 WHERE id=?",
            status,
            JSON.stringify(conf),
            sid,
          );
          yield this.audit(sid, user.id, "session.updated", sid, {
            before: {
              status: old.status,
              config: JSON.parse(old.config),
            },
            after: {
              status,
              config: conf,
            },
          });
          return yield this.session(user, sid);
        }.bind(this),
      ),
    );
  }
  *members(user, sid) {
    yield this.member(user, sid, ["admin", "researcher"]);
    return yield this.all(
      "SELECT u.id,u.alias,m.role,m.created_at FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.session_id=?",
      sid,
    );
  }
  *invite(user, sid, body) {
    exact(body, ["role"]);
    yield this.member(user, sid, ["admin"]);
    yield this.active(sid);
    if (!["participant", "researcher", "admin"].includes(body.role))
      fail(400, "ROLE", "Papel inválido.");
    return yield this.tx(
      flow(
        function* () {
          const secret = token(),
            iid = id();
          yield this.run(
            "INSERT INTO invitations VALUES(?,?,?,?,?,?,?)",
            iid,
            sid,
            hash(secret),
            body.role,
            this.now() + 72 * 3600000,
            null,
            this.now(),
          );
          yield this.audit(sid, user.id, "invitation.created", iid, {
            role: body.role,
          });
          return {
            code: secret,
            expiresAt: this.now() + 72 * 3600000,
            role: body.role,
          };
        }.bind(this),
      ),
    );
  }
  *join(user, body) {
    exact(body, ["code"]);
    return yield this.tx(
      flow(
        function* () {
          const invitation = yield this.one(
            "SELECT * FROM invitations WHERE token_hash=?",
            hash(text(body.code, "Convite", 20, 100)),
          );
          if (
            !invitation ||
            invitation.expires_at < this.now() ||
            invitation.consumed_by
          )
            fail(400, "INVITATION", "Convite inválido, utilizado ou expirado.");
          yield this.active(invitation.session_id);
          if (
            yield this.one(
              "SELECT 1 FROM memberships WHERE session_id=? AND user_id=?",
              invitation.session_id,
              user.id,
            )
          )
            fail(409, "MEMBER_EXISTS", "Você já participa desta sessão.");
          yield this.run(
            "INSERT INTO memberships VALUES(?,?,?,?)",
            invitation.session_id,
            user.id,
            invitation.role,
            this.now(),
          );
          yield this.run(
            "UPDATE invitations SET consumed_by=? WHERE id=?",
            user.id,
            invitation.id,
          );
          yield this.audit(
            invitation.session_id,
            user.id,
            "membership.joined",
            user.id,
            {
              role: invitation.role,
            },
          );
          return yield this.session(user, invitation.session_id);
        }.bind(this),
      ),
    );
  }
  *setRole(user, sid, uid, body) {
    exact(body, ["role"]);
    yield this.member(user, sid, ["admin"]);
    if (!["admin", "researcher", "participant"].includes(body.role))
      fail(400, "ROLE", "Papel inválido.");
    return yield this.tx(
      flow(
        function* () {
          const old = yield this.member(
            {
              id: uid,
            },
            sid,
          );
          if (
            old.role === "admin" &&
            body.role !== "admin" &&
            (yield this.one(
              "SELECT COUNT(*) n FROM memberships WHERE session_id=? AND role='admin'",
              sid,
            )).n <= 1
          )
            fail(409, "LAST_ADMIN", "Mantenha ao menos um administrador.");
          yield this.run(
            "UPDATE memberships SET role=? WHERE session_id=? AND user_id=?",
            body.role,
            sid,
            uid,
          );
          yield this.audit(sid, user.id, "membership.role", uid, {
            from: old.role,
            to: body.role,
          });
          return {
            role: body.role,
          };
        }.bind(this),
      ),
    );
  }
  *_account(user, sid, body, allocation, actor = user) {
    const aid = id();
    const allowedProfiles = JSON.parse(
      (yield this.one("SELECT config FROM sessions WHERE id=?", sid)).config,
    ).profiles;
    const profile = body.profile || allowedProfiles[0];
    if (!allowedProfiles.includes(profile))
      fail(400, "PROFILE", "Perfil experimental inválido.");
    yield this.run(
      "INSERT INTO accounts VALUES(?,?,?,?,?,?,?,?,?)",
      aid,
      sid,
      user.id,
      text(body.name, "Titular fictício", 2, 80),
      profile,
      "virtual",
      "active",
      200000,
      this.now(),
    );
    if (allocation > 0) {
      const treasury = yield this.one(
        "SELECT id FROM accounts WHERE session_id=? AND kind='treasury'",
        sid,
      );
      yield this._post(
        actor,
        sid,
        treasury.id,
        aid,
        allocation,
        "allocation",
        `allocation:${aid}`,
        null,
        null,
        "Alocação inicial virtual definida pela sessão.",
      );
    }
    yield this._key(user, aid, actor);
    yield this.audit(sid, actor.id, "account.created", aid, {
      profile,
      allocationCents: allocation,
    });
    return aid;
  }
  *createAccount(user, sid, body) {
    exact(body, ["name", "profile"]);
    yield this.member(user, sid);
    return yield this.tx(
      flow(
        function* () {
          const conf = JSON.parse((yield this.active(sid)).config);
          if (
            (yield this.one(
              "SELECT COUNT(*) n FROM accounts WHERE session_id=? AND owner_id=? AND kind='virtual'",
              sid,
              user.id,
            )).n >= conf.maxAccounts
          )
            fail(
              409,
              "ACCOUNT_LIMIT",
              "Limite de contas por participante atingido.",
            );
          return yield this.account(
            user,
            yield this._account(user, sid, body, conf.initialCents),
          );
        }.bind(this),
      ),
    );
  }
  *_key(user, aid, actor = user) {
    const account = yield this.mine(user, aid),
      kid = id(),
      value = `sim-${token().slice(0, 16).toLowerCase()}@pix.justec.invalid`;
    yield this.run(
      "INSERT INTO pix_keys VALUES(?,?,?,?,?,?,?)",
      kid,
      account.session_id,
      aid,
      value,
      1,
      1,
      this.now(),
    );
    yield this.audit(account.session_id, actor.id, "key.created", kid, {
      accountId: aid,
      value,
    });
    return {
      id: kid,
      value,
      version: 1,
    };
  }
  *addKey(user, aid) {
    return yield this.tx(
      flow(
        function* () {
          const account = yield this.mine(user, aid);
          yield this.active(account.session_id);
          if (
            (yield this.one(
              "SELECT COUNT(*) n FROM pix_keys WHERE account_id=? AND active=1",
              aid,
            )).n >= 5
          )
            fail(409, "KEY_LIMIT", "Limite de cinco chaves ativas.");
          return yield this._key(user, aid);
        }.bind(this),
      ),
    );
  }
  *changeKey(user, kid, { remove = false } = {}) {
    return yield this.tx(
      flow(
        function* () {
          const key = yield this.one("SELECT * FROM pix_keys WHERE id=?", kid);
          if (!key) fail(404, "KEY", "Chave inexistente.");
          const account = yield this.mine(user, key.account_id);
          yield this.active(account.session_id);
          if (!key.active) fail(409, "KEY", "Chave já desativada.");
          yield this.run(
            "UPDATE pix_keys SET active=0,version=version+1 WHERE id=?",
            kid,
          );
          yield this.audit(
            account.session_id,
            user.id,
            remove ? "key.deleted" : "key.rotated",
            kid,
            {
              accountId: account.id,
              previous: key.value,
            },
          );
          return remove
            ? {
                removed: true,
              }
            : yield this._key(user, account.id);
        }.bind(this),
      ),
    );
  }
  *account(user, aid) {
    const a = yield this.mine(user, aid);
    return {
      id: a.id,
      sessionId: a.session_id,
      name: a.name,
      profile: a.profile,
      status: a.status,
      limitCents: a.limit_cents,
      balanceCents: yield this.balance(aid),
      createdAt: a.created_at,
      keys: yield this.all(
        "SELECT id,value,version,active FROM pix_keys WHERE account_id=? ORDER BY created_at",
        aid,
      ),
    };
  }
  *accounts(user, sid) {
    yield this.member(user, sid);
    return yield collect(
      (yield this.all(
        "SELECT id FROM accounts WHERE session_id=? AND owner_id=? AND kind='virtual' ORDER BY created_at",
        sid,
        user.id,
      )).map(
        flow(
          function* (a) {
            return yield this.account(user, a.id);
          }.bind(this),
        ),
      ),
    );
  }
  *lookup(user, sid, value) {
    yield this.member(user, sid);
    const key = yield this.one(
      "SELECT k.*,a.name,a.status,a.kind FROM pix_keys k JOIN accounts a ON a.id=k.account_id WHERE k.session_id=? AND k.value=? AND k.active=1 AND a.kind='virtual'",
      sid,
      text(value, "Chave fictícia", 10, 120).toLowerCase(),
    );
    if (!key) fail(404, "RECIPIENT", "Chave inexistente nesta sessão.");
    return {
      accountId: key.account_id,
      keyId: key.id,
      keyVersion: key.version,
      name: key.name,
      institution: "Instituição fictícia JUSTEC",
      maskedKey: `sim-***${key.value.slice(-26)}`,
      key: key.value,
      status: key.status,
    };
  }
  *configureAccount(user, aid, body) {
    exact(body, ["status", "profile", "limitCents", "reason"]);
    const a = yield this.one(
      "SELECT * FROM accounts WHERE id=? AND kind='virtual'",
      aid,
    );
    if (!a) fail(404, "ACCOUNT", "Conta inexistente.");
    yield this.member(user, a.session_id, ["admin", "researcher"]);
    yield this.active(a.session_id);
    const status = body.status ?? a.status,
      profile = body.profile ?? a.profile,
      limit = body.limitCents ?? a.limit_cents;
    if (
      !["active", "restricted", "closed"].includes(status) ||
      !JSON.parse(
        (yield this.one("SELECT config FROM sessions WHERE id=?", a.session_id))
          .config,
      ).profiles.includes(profile)
    )
      fail(400, "ACCOUNT", "Configuração inválida.");
    cents(limit);
    return yield this.tx(
      flow(
        function* () {
          yield this.run(
            "UPDATE accounts SET status=?,profile=?,limit_cents=? WHERE id=?",
            status,
            profile,
            limit,
            aid,
          );
          yield this.audit(a.session_id, user.id, "account.configured", aid, {
            before: {
              status: a.status,
              profile: a.profile,
              limitCents: a.limit_cents,
            },
            after: {
              status,
              profile,
              limitCents: limit,
            },
            reason: text(body.reason, "Fundamento", 10, 500),
          });
          return {
            updated: true,
          };
        }.bind(this),
      ),
    );
  }
  *allocate(user, aid, body) {
    exact(body, ["amountCents", "reason"]);
    const a = yield this.one(
      "SELECT * FROM accounts WHERE id=? AND kind='virtual'",
      aid,
    );
    if (!a) fail(404, "ACCOUNT", "Conta inexistente.");
    yield this.member(user, a.session_id, ["admin"]);
    yield this.active(a.session_id);
    const amount = cents(body.amountCents),
      reason = text(body.reason, "Justificativa", 10, 500);
    return yield this.tx(
      flow(
        function* () {
          const treasury = yield this.one(
            "SELECT id FROM accounts WHERE session_id=? AND kind='treasury'",
            a.session_id,
          );
          const tx = yield this._post(
            user,
            a.session_id,
            treasury.id,
            aid,
            amount,
            "adjustment",
            id(),
            null,
            null,
            reason,
          );
          yield this.audit(
            a.session_id,
            user.id,
            "allocation.adjustment",
            tx.id,
            {
              accountId: aid,
              amountCents: amount,
              reason,
            },
          );
          return tx;
        }.bind(this),
      ),
    );
  }
  *_post(
    user,
    sid,
    from,
    to,
    amount,
    kind,
    idem,
    draftId,
    evaluationId,
    reason,
  ) {
    cents(amount);
    if (from === to)
      fail(400, "SELF_TRANSFER", "A origem e o destino devem ser diferentes.");
    const source = yield this.one(
        "SELECT * FROM accounts WHERE id=? AND session_id=?",
        from,
        sid,
      ),
      target = yield this.one(
        "SELECT * FROM accounts WHERE id=? AND session_id=?",
        to,
        sid,
      );
    if (!source || !target)
      fail(400, "SESSION_ISOLATION", "Contas devem pertencer à mesma sessão.");
    if (source.kind !== "treasury" && (yield this.balance(from)) < amount)
      fail(409, "BALANCE", "Saldo virtual insuficiente.");
    if (
      target.kind !== "treasury" &&
      (yield this.balance(to)) + amount > 1000000000
    )
      fail(409, "BALANCE_LIMIT", "Limite de saldo virtual atingido.");
    const tid = id(),
      time = this.now(),
      digest = hash(JSON.stringify([from, to, amount, kind, draftId]));
    yield this.run(
      "INSERT INTO transfers VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      tid,
      sid,
      user.id,
      from,
      to,
      amount,
      kind,
      "completed",
      draftId,
      idem,
      digest,
      evaluationId,
      reason,
      time,
    );
    yield this.run(
      "INSERT INTO ledger_entries VALUES(?,?,?,?,?,?)",
      id(),
      sid,
      tid,
      from,
      -amount,
      time,
    );
    yield this.run(
      "INSERT INTO ledger_entries VALUES(?,?,?,?,?,?)",
      id(),
      sid,
      tid,
      to,
      amount,
      time,
    );
    const check = yield this.one(
      "SELECT COUNT(*) n,SUM(delta_cents) total FROM ledger_entries WHERE transfer_id=?",
      tid,
    );
    if (check.n !== 2 || check.total !== 0)
      throw new Error("Ledger invariant violated");
    yield this.audit(sid, user.id, "ledger.posted", tid, {
      sourceId: from,
      destinationId: to,
      amountCents: amount,
      kind,
    });
    return yield this.receipt(user, tid, true);
  }
  *_validDraft(user, draft) {
    const source = yield this.mine(user, draft.source_id);
    const s = yield this.active(source.session_id);
    if (draft.actor_id !== user.id || draft.session_id !== source.session_id)
      fail(403, "DRAFT_ACCESS", "Rascunho não autorizado.");
    if (draft.expires_at < this.now())
      fail(409, "EXPIRED", "Rascunho expirou. Refaça a conferência.");
    if (source.status !== "active")
      fail(409, "SOURCE_RESTRICTED", "Conta de origem não está operacional.");
    const target = yield this.one(
      "SELECT * FROM accounts WHERE id=? AND session_id=? AND kind='virtual'",
      draft.destination_id,
      draft.session_id,
    );
    const key = yield this.one(
      "SELECT * FROM pix_keys WHERE id=? AND active=1",
      draft.key_id,
    );
    if (
      !target ||
      target.status === "closed" ||
      !key ||
      key.account_id !== target.id ||
      key.version !== draft.key_version
    )
      fail(
        409,
        "RECIPIENT_CHANGED",
        "Chave ou destinatário mudou. Refaça a conferência.",
      );
    cents(draft.amount_cents);
    if (draft.amount_cents > source.limit_cents)
      fail(409, "LIMIT", "Limite experimental da conta excedido.");
    if (draft.amount_cents > (yield this.balance(source.id)))
      fail(409, "BALANCE", "Saldo virtual insuficiente.");
    return {
      source,
      target,
      key,
      session: s,
    };
  }
  *drafts(user, sid) {
    yield this.member(user, sid);
    return yield collect(
      (yield this.all(
        "SELECT id FROM drafts WHERE session_id=? AND actor_id=? ORDER BY created_at DESC LIMIT 30",
        sid,
        user.id,
      )).map(
        flow(
          function* (d) {
            return yield this.draft(user, d.id);
          }.bind(this),
        ),
      ),
    );
  }
  *createDraft(user, sid, body, operationId = null, clearanceId = null) {
    exact(body, ["sourceId", "key", "amountCents", "requestContext"]);
    yield this.member(user, sid);
    cents(body.amountCents);
    if (
      body.requestContext !== undefined &&
      typeof body.requestContext !== "boolean"
    )
      fail(400, "CONTEXT", "Pedido contextual inválido.");
    return yield this.tx(
      flow(
        function* () {
          return yield this._draft(user, sid, body, operationId, clearanceId);
        }.bind(this),
      ),
    );
  }
  *_draft(user, sid, body, operationId = null, clearanceId = null) {
    const source = yield this.mine(user, text(body.sourceId, "Conta", 1, 80));
    if (source.session_id !== sid)
      fail(403, "SESSION_ISOLATION", "Conta fora da sessão.");
    const target = yield this.lookup(user, sid, body.key);
    if (source.id === target.accountId)
      fail(400, "SELF_TRANSFER", "Não transfira para a mesma conta.");
    const session = yield this.active(sid),
      did = id(),
      time = this.now();
    yield this.run(
      "INSERT INTO drafts(id,session_id,actor_id,source_id,destination_id,key_id,key_version,amount_cents,status,request_context,config_version,expires_at,created_at,operation_id,clearance_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      did,
      sid,
      user.id,
      source.id,
      target.accountId,
      target.keyId,
      target.keyVersion,
      body.amountCents,
      "review",
      body.requestContext ? 1 : 0,
      session.config_version,
      time + 15 * 60000,
      time,
      operationId,
      clearanceId,
    );
    yield this._validDraft(
      user,
      yield this.one("SELECT * FROM drafts WHERE id=?", did),
    );
    yield this.audit(sid, user.id, "draft.created", did, {
      sourceId: source.id,
      destinationId: target.accountId,
      amountCents: body.amountCents,
    });
    return yield this.draft(user, did);
  }
  *draft(user, did) {
    const d = yield this.one("SELECT * FROM drafts WHERE id=?", did);
    if (!d || d.actor_id !== user.id)
      fail(403, "DRAFT_ACCESS", "Rascunho não autorizado.");
    yield this.member(user, d.session_id);
    const target = yield this.one(
        "SELECT name FROM accounts WHERE id=?",
        d.destination_id,
      ),
      key = yield this.one("SELECT value FROM pix_keys WHERE id=?", d.key_id);
    return {
      id: d.id,
      sessionId: d.session_id,
      sourceId: d.source_id,
      revisionOf: d.revision_of,
      destinationId: d.destination_id,
      recipient: target.name,
      institution: "Instituição fictícia JUSTEC",
      maskedKey: `sim-***${key.value.slice(-26)}`,
      amountCents: d.amount_cents,
      status: d.status,
      readyAt: d.ready_at,
      serverNow: this.now(),
      transferId:
        (yield this.one("SELECT id FROM transfers WHERE draft_id=?", d.id))
          ?.id || null,
      expiresAt: d.expires_at,
      evaluation: d.evaluation_id
        ? yield this.evaluation(user, d.evaluation_id)
        : null,
    };
  }
  *evaluation(user, eid) {
    const e = yield this.one("SELECT * FROM evaluations WHERE id=?", eid);
    if (!e) fail(404, "EVALUATION", "Avaliação inexistente.");
    const d = yield this.one(
      "SELECT actor_id FROM drafts WHERE id=?",
      e.draft_id,
    );
    if (d.actor_id !== user.id)
      yield this.member(user, e.session_id, ["admin", "researcher"]);
    else yield this.member(user, e.session_id);
    return {
      id: e.id,
      phase: e.phase,
      createdAt: e.created_at,
      ...JSON.parse(e.evidence),
      decision: JSON.parse(e.decision),
    };
  }
  *_evaluate(user, d, phase) {
    const { source, target, session } = yield this._validDraft(user, d);
    const txs = (yield this.all(
      "SELECT t.destination_id,t.amount_cents FROM transfers t WHERE t.source_id=? AND t.kind IN ('pix','scenario_history') ORDER BY t.created_at",
      source.id,
    )).concat(
      yield this.all(
        "SELECT recipient_id destination_id,amount_cents FROM account_observations WHERE account_id=?",
        source.id,
      ),
    );
    const transactions = txs.map((t) => ({
      type: "pix-out",
      status: "completed",
      amount: -t.amount_cents / 100,
      participant: {
        id: t.destination_id,
      },
    }));
    const attempts = (yield this.all(
      "SELECT destination_id FROM drafts WHERE source_id=? AND status='blocked' AND id<>?",
      source.id,
      d.id,
    ))
      .concat(
        yield this.all(
          "SELECT destination_id FROM attempt_observations WHERE source_id=?",
          source.id,
        ),
      )
      .map((a) => ({
        recipientId: a.destination_id,
      }));
    const conf = JSON.parse(session.config);
    const result = guard.evaluate({
      draft: {
        id: d.id,
        recipient: {
          id: target.id,
        },
        amount: d.amount_cents / 100,
        requestContext: !!d.request_context,
      },
      transactions,
      attempts,
      restricted: target.status === "restricted",
      settings: conf,
      responses: JSON.parse(d.answers),
      acknowledged: !!d.acknowledgement,
      collectedAt: new Date(this.now()).toISOString(),
      manualClearance: !!d.clearance_id,
    });
    const eid = id();
    const { decision, ...evidence } = result;
    yield this.run(
      "INSERT INTO evaluations VALUES(?,?,?,?,?,?,?,?)",
      eid,
      d.session_id,
      d.id,
      phase,
      JSON.stringify(evidence),
      JSON.stringify(decision),
      result.rulesVersion,
      this.now(),
    );
    yield this.audit(d.session_id, user.id, "guard.evaluated", eid, {
      draftId: d.id,
      phase,
      action: decision.action,
      rulesVersion: result.rulesVersion,
      codes: decision.codes,
    });
    return {
      id: eid,
      ...result,
    };
  }
  *evaluateDraft(user, did, body) {
    exact(body, ["answers", "acknowledged"]);
    const responses = guard.answers(body.answers || {});
    if (
      body.acknowledged !== undefined &&
      typeof body.acknowledged !== "boolean"
    )
      fail(400, "ACK", "Confirmação inválida.");
    return yield this.tx(
      flow(
        function* () {
          let d = yield this.one("SELECT * FROM drafts WHERE id=?", did);
          if (!d || d.actor_id !== user.id)
            fail(403, "DRAFT_ACCESS", "Rascunho não autorizado.");
          if (!["review", "verification"].includes(d.status))
            fail(409, "STAGE", "Refaça a revisão ou crie nova operação.");
          yield this.run(
            "UPDATE drafts SET answers=?,acknowledgement=? WHERE id=?",
            JSON.stringify(responses),
            body.acknowledged ? 1 : 0,
            did,
          );
          d = yield this.one("SELECT * FROM drafts WHERE id=?", did);
          const result = yield this._evaluate(user, d, "review");
          const status =
            result.decision.action === "BLOCKED"
              ? "blocked"
              : result.needsVerification
                ? "verification"
                : "pause";
          const confVersion = (yield this.one(
            "SELECT config_version FROM sessions WHERE id=?",
            d.session_id,
          )).config_version;
          yield this.run(
            "UPDATE drafts SET evaluation_id=?,status=?,config_version=?,ready_at=?,finished_at=? WHERE id=?",
            result.id,
            status,
            confVersion,
            status === "pause" ? this.now() + result.pauseMs : null,
            status === "blocked" ? this.now() : null,
            did,
          );
          yield this.audit(d.session_id, user.id, "draft.decision", did, {
            status,
            pauseMs: result.pauseMs,
            acknowledged: !!body.acknowledged,
          });
          return yield this.draft(user, did);
        }.bind(this),
      ),
    );
  }
  *reviseDraft(user, did) {
    return yield this.tx(
      flow(
        function* () {
          const d = yield this.one("SELECT * FROM drafts WHERE id=?", did);
          if (!d || d.actor_id !== user.id)
            fail(403, "DRAFT_ACCESS", "Rascunho não autorizado.");
          if (["completed", "blocked"].includes(d.status) || d.clearance_id)
            fail(
              409,
              "STAGE",
              "Use uma nova operação ou a revisão registrada.",
            );
          const existing = yield this.one(
            "SELECT id FROM drafts WHERE revision_of=? AND clearance_id IS NULL",
            did,
          );
          if (existing) return yield this.draft(user, existing.id);
          const key = yield this.one(
            "SELECT value FROM pix_keys WHERE id=?",
            d.key_id,
          );
          yield this.run(
            "UPDATE drafts SET status='cancelled',ready_at=NULL,finished_at=? WHERE id=?",
            this.now(),
            did,
          );
          const replacement = yield this._draft(user, d.session_id, {
            sourceId: d.source_id,
            key: key.value,
            amountCents: d.amount_cents,
            requestContext: !!d.request_context,
          });
          yield this.run(
            "UPDATE drafts SET revision_of=? WHERE id=?",
            did,
            replacement.id,
          );
          yield this.audit(d.session_id, user.id, "draft.revised", did, {
            replacementId: replacement.id,
          });
          return yield this.draft(user, replacement.id);
        }.bind(this),
      ),
    );
  }
  *cancelDraft(user, did, body) {
    exact(body, ["reason"]);
    return yield this.tx(
      flow(
        function* () {
          const d = yield this.one("SELECT * FROM drafts WHERE id=?", did);
          if (!d || d.actor_id !== user.id)
            fail(403, "DRAFT_ACCESS", "Rascunho não autorizado.");
          yield this.member(user, d.session_id);
          if (["completed", "blocked", "cancelled"].includes(d.status))
            fail(409, "STAGE", "Operação já encerrada.");
          yield this.run(
            "UPDATE drafts SET status='cancelled',ready_at=NULL,finished_at=? WHERE id=?",
            this.now(),
            did,
          );
          yield this.audit(d.session_id, user.id, "draft.reconsidered", did, {
            reason: text(
              body.reason || "Reconsideração voluntária",
              "Motivo",
              3,
              300,
            ),
          });
          return yield this.draft(user, did);
        }.bind(this),
      ),
    );
  }
  *authorize(user, did, body, idem) {
    exact(body, ["demoCode"]);
    text(idem, "Idempotência", 8, 100);
    return yield this.tx(
      flow(
        function* () {
          let d = yield this.one("SELECT * FROM drafts WHERE id=?", did);
          if (!d || d.actor_id !== user.id)
            fail(403, "DRAFT_ACCESS", "Rascunho não autorizado.");
          yield this.member(user, d.session_id);
          const existing = yield this.one(
            "SELECT * FROM transfers WHERE draft_id=?",
            did,
          );
          if (existing) return yield this.receipt(user, existing.id);
          const duplicate = yield this.one(
            "SELECT * FROM transfers WHERE session_id=? AND actor_id=? AND idempotency_key=?",
            d.session_id,
            user.id,
            idem,
          );
          if (duplicate)
            fail(
              409,
              "IDEMPOTENCY_CONFLICT",
              "Chave de idempotência já usada por outra operação.",
            );
          if (d.status !== "pause" || d.ready_at === null)
            fail(
              409,
              "STAGE",
              "Conclua conferência e verificações antes de autorizar.",
            );
          yield this._validDraft(user, d);
          const current = yield this.one(
            "SELECT config_version FROM sessions WHERE id=?",
            d.session_id,
          );
          if (current.config_version !== d.config_version)
            fail(
              409,
              "POLICY_CHANGED",
              "A política mudou. Refaça a conferência.",
            );
          if (this.now() < d.ready_at)
            fail(409, "PAUSE", "Aguarde a pausa educativa do servidor.");
          if (body.demoCode !== "0000")
            fail(400, "DEMO_CODE", "Use apenas o código demonstrativo 0000.");
          const result = yield this._evaluate(user, d, "authorization");
          if (
            result.decision.action === "BLOCKED" ||
            result.needsVerification
          ) {
            yield this.run(
              "UPDATE drafts SET status=?,evaluation_id=?,ready_at=NULL,finished_at=? WHERE id=?",
              result.decision.action === "BLOCKED" ? "blocked" : "verification",
              result.id,
              result.decision.action === "BLOCKED" ? this.now() : null,
              did,
            );
            return {
              interrupted: true,
              draft: yield this.draft(user, did),
            };
          }
          const receipt = yield this._post(
            user,
            d.session_id,
            d.source_id,
            d.destination_id,
            d.amount_cents,
            "pix",
            idem,
            did,
            result.id,
            "Pix interno — SIMULAÇÃO SEM VALOR FINANCEIRO",
          );
          yield this.run(
            "UPDATE drafts SET status='completed',evaluation_id=?,finished_at=? WHERE id=?",
            result.id,
            this.now(),
            did,
          );
          yield this.audit(d.session_id, user.id, "draft.authorized", did, {
            transferId: receipt.id,
            evaluationId: result.id,
          });
          return receipt;
        }.bind(this),
      ),
    );
  }
  *receipt(user, tid, internal = false) {
    const t = yield this.one("SELECT * FROM transfers WHERE id=?", tid);
    if (!t) fail(404, "TRANSFER", "Operação inexistente.");
    const source = yield this.one(
        "SELECT * FROM accounts WHERE id=?",
        t.source_id,
      ),
      target = yield this.one(
        "SELECT * FROM accounts WHERE id=?",
        t.destination_id,
      );
    if (!internal && source.owner_id !== user.id && target.owner_id !== user.id)
      yield this.member(user, t.session_id, ["admin", "researcher"]);
    else yield this.member(user, t.session_id);
    const key = t.draft_id
      ? yield this.one(
          "SELECT k.value FROM drafts d JOIN pix_keys k ON k.id=d.key_id WHERE d.id=?",
          t.draft_id,
        )
      : null;
    return {
      id: t.id,
      sessionId: t.session_id,
      sourceId: source.id,
      destinationId: target.id,
      source: source.name,
      destination: target.name,
      institution: "Instituição fictícia JUSTEC",
      maskedKey: key ? `sim-***${key.value.slice(-26)}` : null,
      amountCents: t.amount_cents,
      kind: t.kind,
      status: t.status,
      createdAt: t.created_at,
      evaluationId: t.evaluation_id,
      reason: t.reason,
      entries: yield this.all(
        "SELECT account_id accountId,delta_cents deltaCents FROM ledger_entries WHERE transfer_id=?",
        tid,
      ),
      disclaimer: "SIMULAÇÃO — SEM VALOR FINANCEIRO",
    };
  }
  *statement(user, aid, query = {}) {
    return yield this.tx(
      flow(
        function* () {
          const a = yield this.mine(user, aid);
          const period = query.days === undefined ? 90 : Number(query.days);
          if (![7, 30, 90, 365, 3650].includes(period))
            fail(400, "FILTER", "Período inválido.");
          if (
            query.type &&
            ![
              "all",
              "in",
              "out",
              "pix",
              "allocation",
              "adjustment",
              "scenario_history",
              "restoration",
            ].includes(query.type)
          )
            fail(400, "FILTER", "Tipo inválido.");
          if (
            query.status &&
            !["all", "completed", "blocked", "cancelled"].includes(query.status)
          )
            fail(400, "FILTER", "Situação inválida.");
          const all = yield this.all(
            "SELECT l.*,t.kind,t.source_id,t.destination_id,t.status FROM ledger_entries l JOIN transfers t ON t.id=l.transfer_id WHERE l.account_id=? ORDER BY l.created_at,l.rowid",
            aid,
          );
          let running = 0;
          const entries = (yield collect(
            all.map(
              flow(
                function* (row) {
                  running += row.delta_cents;
                  return {
                    transferId: row.transfer_id,
                    deltaCents: row.delta_cents,
                    balanceAfterCents: running,
                    createdAt: row.created_at,
                    kind: row.kind,
                    status: row.status,
                    counterparty: (yield this.one(
                      "SELECT name FROM accounts WHERE id=?",
                      row.delta_cents > 0 ? row.source_id : row.destination_id,
                    )).name,
                  };
                }.bind(this),
              ),
            ),
          )).filter(
            (row) =>
              row.createdAt >= this.now() - period * 86400000 &&
              (!query.type ||
                query.type === "all" ||
                (query.type === "in" && row.deltaCents > 0) ||
                (query.type === "out" && row.deltaCents < 0) ||
                query.type === row.kind) &&
              (!query.status || ["all", "completed"].includes(query.status)),
          );
          const attempts = (yield this.all(
            "SELECT id,status,amount_cents amountCents,created_at createdAt FROM drafts WHERE source_id=? AND status IN ('blocked','cancelled') AND created_at>=? ORDER BY created_at DESC",
            aid,
            this.now() - period * 86400000,
          )).filter(
            (d) =>
              !query.status ||
              query.status === "all" ||
              query.status === d.status,
          );
          return {
            accountId: aid,
            balanceCents: yield this.balance(aid),
            entries: entries.reverse(),
            attempts,
          };
        }.bind(this),
      ),
    );
  }
  *feedback(user, did, body) {
    exact(body, ["understanding", "intention"]);
    const d = yield this.one("SELECT * FROM drafts WHERE id=?", did);
    if (!d || d.actor_id !== user.id)
      fail(403, "DRAFT_ACCESS", "Operação não autorizada.");
    yield this.member(user, d.session_id);
    if (!["completed", "blocked", "cancelled"].includes(d.status))
      fail(
        409,
        "FEEDBACK",
        "Conclua ou reconsidere a operação antes de responder.",
      );
    if (
      !["yes", "no", "unknown"].includes(body.understanding) ||
      !["continue", "reconsider", "unknown"].includes(body.intention)
    )
      fail(400, "FEEDBACK", "Respostas inválidas.");
    return yield this.tx(
      flow(
        function* () {
          if (
            yield this.one(
              "SELECT 1 FROM participant_feedback WHERE draft_id=? AND user_id=?",
              did,
              user.id,
            )
          )
            fail(
              409,
              "FEEDBACK",
              "Resposta já registrada, sem sobrescrever o histórico.",
            );
          const fid = id();
          yield this.run(
            "INSERT INTO participant_feedback VALUES(?,?,?,?,?,?,?)",
            fid,
            d.session_id,
            did,
            user.id,
            body.understanding,
            body.intention,
            this.now(),
          );
          yield this.audit(d.session_id, user.id, "participant.feedback", fid, {
            draftId: did,
          });
          return {
            id: fid,
          };
        }.bind(this),
      ),
    );
  }
  *requestReview(user, did, body) {
    exact(body, ["reason"]);
    return yield this.tx(
      flow(
        function* () {
          const d = yield this.one("SELECT * FROM drafts WHERE id=?", did);
          if (!d || d.actor_id !== user.id)
            fail(403, "DRAFT_ACCESS", "Rascunho não autorizado.");
          yield this.member(user, d.session_id);
          if (!["blocked", "verification"].includes(d.status))
            fail(
              409,
              "REVIEW",
              "Somente operação interrompida ou inconclusiva pode ser revista.",
            );
          if (yield this.one("SELECT 1 FROM reviews WHERE draft_id=?", did))
            fail(409, "REVIEW", "Revisão já solicitada.");
          const rid = id(),
            reason = text(body.reason, "Esclarecimento fictício", 10, 500);
          yield this.run(
            "INSERT INTO reviews VALUES(?,?,?,?,?,?)",
            rid,
            d.session_id,
            did,
            user.id,
            reason,
            this.now(),
          );
          yield this.audit(d.session_id, user.id, "review.requested", rid, {
            draftId: did,
            reason,
          });
          return {
            id: rid,
          };
        }.bind(this),
      ),
    );
  }
  *reviews(user, sid) {
    const m = yield this.member(user, sid);
    const research = ["admin", "researcher"].includes(m.role);
    return yield this.all(
      `SELECT r.*,d.decision,d.reason decision_reason,d.created_at decided_at FROM reviews r LEFT JOIN review_decisions d ON d.review_id=r.id WHERE r.session_id=? ${research ? "" : "AND r.requester_id=?"} ORDER BY r.created_at DESC`,
      ...(research ? [sid] : [sid, user.id]),
    );
  }
  *resolveReview(user, rid, body) {
    exact(body, ["decision", "reason"]);
    const r = yield this.one("SELECT * FROM reviews WHERE id=?", rid);
    if (!r) fail(404, "REVIEW", "Revisão inexistente.");
    yield this.member(user, r.session_id, ["admin", "researcher"]);
    yield this.active(r.session_id);
    if (!["uphold", "release"].includes(body.decision))
      fail(400, "REVIEW", "Decisão inválida.");
    return yield this.tx(
      flow(
        function* () {
          if (
            yield this.one(
              "SELECT 1 FROM review_decisions WHERE review_id=?",
              rid,
            )
          )
            fail(409, "REVIEW", "Decisão já registrada.");
          const decisionId = id(),
            reason = text(body.reason, "Fundamento", 10, 500);
          yield this.run(
            "INSERT INTO review_decisions VALUES(?,?,?,?,?,?)",
            decisionId,
            rid,
            user.id,
            body.decision,
            reason,
            this.now(),
          );
          yield this.audit(r.session_id, user.id, "review.decided", rid, {
            decisionId,
            decision: body.decision,
            reason,
          });
          return {
            id: decisionId,
            decision: body.decision,
          };
        }.bind(this),
      ),
    );
  }
  *followup(user, rid) {
    return yield this.tx(
      flow(
        function* () {
          const r = yield this.one(
            "SELECT r.*,x.id clearance,x.decision FROM reviews r JOIN review_decisions x ON x.review_id=r.id WHERE r.id=?",
            rid,
          );
          if (!r || r.requester_id !== user.id || r.decision !== "release")
            fail(403, "REVIEW", "Sem liberação registrada para esta operação.");
          const existing = yield this.one(
            "SELECT id FROM drafts WHERE clearance_id=?",
            r.clearance,
          );
          if (existing) return yield this.draft(user, existing.id);
          const d = yield this.one(
              "SELECT * FROM drafts WHERE id=?",
              r.draft_id,
            ),
            key = yield this.one(
              "SELECT value FROM pix_keys WHERE id=?",
              d.key_id,
            );
          return yield this._draft(
            user,
            d.session_id,
            {
              sourceId: d.source_id,
              key: key.value,
              amountCents: d.amount_cents,
              requestContext: false,
            },
            null,
            r.clearance,
          );
        }.bind(this),
      ),
    );
  }
}
wrapMethods(Lab);
module.exports = {
  Lab,
  PROFILES,
};
