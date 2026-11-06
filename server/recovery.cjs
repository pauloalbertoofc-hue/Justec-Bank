"use strict";
const { atomic } = require("./db.cjs");
const { flow } = require("./flow.cjs");
const { exact, fail, hash, token, id, passwordHash, passwordMatches } = require("./security.cjs");
const DURATION = 30 * 24 * 3600000;
const INVALID = "Pseudônimo ou código de recuperação inválido, utilizado ou expirado.";
const audit = flow(function* (db, userId, action, now) {
  yield db.prepare("INSERT INTO audit_events VALUES(?,?,?,?,?,?,?)")
    .run(id(), null, userId, action, userId, "{}", now);
});
async function issue(db, user, body, now = Date.now()) {
  exact(body, ["password"]);
  const row = await db.prepare("SELECT * FROM users WHERE id=?").get(user.id);
  if (!row || !await passwordMatches(body.password, row.password_hash))
    fail(403, "REAUTH", "Confirme sua senha atual para gerar um código.");
  const code = token();
  return await atomic(db, flow(function* () {
    const current = yield db.prepare("SELECT password_hash FROM users WHERE id=?").get(user.id);
    // A senha ou sessão pode ter sido revogada enquanto scrypt estava em andamento.
    const session = yield db.prepare("SELECT 1 FROM auth_sessions WHERE token_hash=? AND user_id=? AND expires_at>?")
      .get(user.tokenHash, user.id, now);
    if (!session || current?.password_hash !== row.password_hash)
      fail(403, "REAUTH", "Entre novamente antes de gerar um código.");
    yield db.prepare("DELETE FROM recovery_codes WHERE user_id=?").run(user.id);
    yield db.prepare("INSERT INTO recovery_codes VALUES(?,?,?,?)")
      .run(user.id, hash(code), now + DURATION, now);
    yield audit(db, user.id, "auth.recovery_code_issued", now);
    return { code, expiresAt: now + DURATION };
  }));
}
async function recover(db, body, now = Date.now()) {
  exact(body, ["alias", "code", "password"]);
  if (typeof body.alias !== "string" || !/^[a-z][a-z0-9_-]{2,31}$/i.test(body.alias) ||
      typeof body.code !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(body.code))
    fail(400, "RECOVERY", INVALID);
  // Derivar a senha antes da consulta, inclusive para conta/código inexistente.
  const encoded = await passwordHash(body.password);
  return await atomic(db, flow(function* () {
    const user = yield db.prepare("SELECT id FROM users WHERE alias=?").get(body.alias);
    const recovery = yield db.prepare("SELECT user_id FROM recovery_codes WHERE token_hash=? AND expires_at>?")
      .get(hash(body.code), now);
    if (!user || !recovery || user.id !== recovery.user_id)
      fail(400, "RECOVERY", INVALID);
    yield db.prepare("UPDATE users SET password_hash=? WHERE id=?").run(encoded, user.id);
    yield db.prepare("DELETE FROM recovery_codes WHERE user_id=?").run(user.id);
    yield db.prepare("DELETE FROM auth_sessions WHERE user_id=?").run(user.id);
    yield audit(db, user.id, "auth.password_recovered", now);
    return { recovered: true };
  }));
}
module.exports = { issue, recover };
