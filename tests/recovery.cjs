"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { fixture, PASSWORD } = require(process.env.JUSTEC_TEST_POSTGRES_URL ? "./postgres-fixture.cjs" : "./lab-fixture.cjs");
const security = require("../server/security.cjs");
const recovery = require("../server/recovery.cjs");
const NEXT = "new-exclusive-lab-password";
async function context(t, who = "alice") {
  const f = await fixture(t);
  const session = await security.login(f.db, { alias: f[who].alias, password: PASSWORD }, f.clock());
  const user = await security.authenticate(f.db, session.secret, f.clock());
  return { f, session, user };
}
test("Código só com senha atual e sessão válida; hash armazenado e auditoria sem segredos", async t => {
  const { f, user } = await context(t);
  await assert.rejects(recovery.issue(f.db, user, { password: "wrong" }, f.clock()), /Confirme/);
  assert.equal((await f.db.prepare("SELECT COUNT(*) n FROM recovery_codes").get()).n, 0);
  const issued = await recovery.issue(f.db, user, { password: PASSWORD }, f.clock());
  assert.match(issued.code, /^[A-Za-z0-9_-]{43}$/);
  const stored = await f.db.prepare("SELECT * FROM recovery_codes WHERE user_id=?").get(user.id);
  assert.equal(stored.token_hash, security.hash(issued.code));
  const audits = await f.db.prepare("SELECT payload FROM audit_events WHERE action=?").all("auth.recovery_code_issued");
  assert.equal(JSON.stringify(audits).includes(issued.code), false);
  await f.db.prepare("DELETE FROM auth_sessions WHERE user_id=?").run(user.id);
  await assert.rejects(recovery.issue(f.db, user, { password: PASSWORD }, f.clock()), /Entre novamente/);
});
test("Recuperação preserva contas/saldo/papéis, invalida código e todas as sessões; não aceita reutilização", async t => {
  const { f, user, session } = await context(t, "admin");
  const second = await security.login(f.db, { alias: f.admin.alias, password: PASSWORD }, f.clock());
  const before = await f.db.prepare("SELECT * FROM accounts ORDER BY id").all();
  const issued = await recovery.issue(f.db, user, { password: PASSWORD }, f.clock());
  await recovery.recover(f.db, { alias: f.admin.alias, code: issued.code, password: NEXT }, f.clock());
  for (const s of [session, second])
    await assert.rejects(async () => security.authenticate(f.db, s.secret, f.clock()), /Entre novamente/);
  await assert.rejects(security.login(f.db, { alias: f.admin.alias, password: PASSWORD }, f.clock()), /inválidas/);
  const login = await security.login(f.db, { alias: f.admin.alias, password: NEXT }, f.clock());
  assert.equal(login.user.globalRole, "admin");
  assert.deepEqual(await f.db.prepare("SELECT * FROM accounts ORDER BY id").all(), before);
  await assert.rejects(recovery.recover(f.db, { alias: f.admin.alias, code: issued.code, password: PASSWORD }, f.clock()), /inválido/);
});
test("Rotação, expiração, conta incorreta e senha inválida não permitem recuperar", async t => {
  const { f, user } = await context(t);
  const old = await recovery.issue(f.db, user, { password: PASSWORD }, f.clock());
  const current = await recovery.issue(f.db, user, { password: PASSWORD }, f.clock());
  for (const body of [
    { alias: f.alice.alias, code: old.code, password: NEXT },
    { alias: f.bob.alias, code: current.code, password: NEXT },
    { alias: "nonexistent-user", code: current.code, password: NEXT },
    { alias: f.alice.alias, code: current.code, password: "short" },
    { alias: f.alice.alias, code: null, password: NEXT },
  ]) await assert.rejects(recovery.recover(f.db, body, f.clock()));
  assert.equal((await security.login(f.db, { alias: f.alice.alias, password: PASSWORD }, f.clock())).user.id, user.id);
  await assert.rejects(recovery.recover(f.db, { alias: f.alice.alias, code: current.code, password: NEXT }, current.expiresAt), /expirado/);
});
test("Consumo concorrente permite apenas uma recuperação", async t => {
  const { f, user } = await context(t);
  const issued = await recovery.issue(f.db, user, { password: PASSWORD }, f.clock());
  const results = await Promise.allSettled([NEXT, "another-exclusive-password"].map(password =>
    recovery.recover(f.db, { alias: f.alice.alias, code: issued.code, password }, f.clock())));
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
});
test("HTTP exige origem, sessão e CSRF para gerar; recuperação é pública sem expor segredos", async t => {
  const f = await fixture(t);
  const { createServer } = require("../server/http.cjs");
  const server = createServer(f.db, { now: f.clock, rateLimit: false });
  server.listen(0, "127.0.0.1");
  await require("node:events").once(server, "listening");
  t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const request = (path, body, headers = {}) => fetch(origin + path, {
    method: "POST", headers: { Origin: origin, "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  assert.equal((await request("/api/auth/recovery-code", { password: PASSWORD })).status, 401);
  const login = await request("/api/auth/login", { alias: f.alice.alias, password: PASSWORD });
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const { csrf } = await login.json();
  assert.equal((await request("/api/auth/recovery-code", { password: PASSWORD }, { Cookie: cookie })).status, 403);
  const issued = await request("/api/auth/recovery-code", { password: PASSWORD }, { Cookie: cookie, "X-CSRF-Token": csrf });
  assert.equal(issued.status, 200);
  assert.match(issued.headers.get("cache-control"), /no-store/);
  const { code } = await issued.json();
  assert.equal((await request("/api/auth/recover", { alias: f.alice.alias, code, password: NEXT }, { Origin: "https://other.invalid" })).status, 403);
  const result = await request("/api/auth/recover", { alias: f.alice.alias, code, password: NEXT });
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { recovered: true });
  const me = await fetch(origin + "/api/auth/me", { headers: { Cookie: cookie } });
  assert.equal(me.status, 401);
});
test("Login concorrente com senha antiga não mantém sessão após recuperação", async t => {
  const { f, user } = await context(t);
  const issued = await recovery.issue(f.db, user, { password: PASSWORD }, f.clock());
  const [reset, attempted] = await Promise.allSettled([
    recovery.recover(f.db, { alias: f.alice.alias, code: issued.code, password: NEXT }, f.clock()),
    security.login(f.db, { alias: f.alice.alias, password: PASSWORD }, f.clock()),
  ]);
  assert.equal(reset.status, "fulfilled");
  if (attempted.status === "fulfilled")
    await assert.rejects(async () => security.authenticate(f.db, attempted.value.secret, f.clock()));
  else assert.equal(attempted.reason.code, "LOGIN");
});
test("Falha na auditoria reverte senha, código e revogação de sessões", async t => {
  const { f, user, session } = await context(t);
  const issued = await recovery.issue(f.db, user, { password: PASSWORD }, f.clock());
  const original = f.db.prepare;
  f.db.prepare = function (sql) {
    if (sql.startsWith("INSERT INTO audit_events")) throw new Error("audit unavailable");
    return original.call(this, sql);
  };
  try {
    await assert.rejects(recovery.recover(f.db, { alias: f.alice.alias, code: issued.code, password: NEXT }, f.clock()), /audit unavailable/);
  } finally { f.db.prepare = original; }
  assert.equal((await security.authenticate(f.db, session.secret, f.clock())).id, user.id);
  await security.login(f.db, { alias: f.alice.alias, password: PASSWORD }, f.clock());
  assert.equal((await recovery.recover(f.db, { alias: f.alice.alias, code: issued.code, password: NEXT }, f.clock())).recovered, true);
});
