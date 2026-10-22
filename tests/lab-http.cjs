const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { fixture, PASSWORD } = require("./lab-fixture.cjs");
const { createServer } = require("../server/http.cjs");
async function httpFixture(t, { secure = false, rateLimit = false } = {}) {
  const f = await fixture(t, { file: true });
  const server = createServer(f.db, {
    now: f.clock,
    rateLimit,
    ...(secure
      ? { origin: () => `https://127.0.0.1:${server.address().port}` }
      : {}),
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const origin = `http://127.0.0.1:${server.address().port}`;
  t.after(
    () =>
      new Promise((resolve) => {
        if (!server.listening) return resolve();
        server.close(resolve);
      }),
  );
  const request = async (
    path,
    {
      method = "GET",
      body,
      cookie,
      csrf,
      idem,
      requestOrigin = secure ? origin.replace("http:", "https:") : origin,
      headers = {},
    } = {},
  ) => {
    const r = await fetch(origin + path, {
      method,
      headers: {
        ...(body !== undefined
          ? { "Content-Type": "application/json", Origin: requestOrigin }
          : {}),
        ...(cookie ? { Cookie: cookie } : {}),
        ...(csrf ? { "X-CSRF-Token": csrf } : {}),
        ...(idem ? { "Idempotency-Key": idem } : {}),
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const type = r.headers.get("content-type") || "";
    const data = type.includes("application/json")
      ? await r.json()
      : await r.text();
    return { status: r.status, headers: r.headers, data };
  };
  async function client(user) {
    const response = await request("/api/auth/login", {
      method: "POST",
      body: { alias: user.alias, password: PASSWORD },
    });
    assert.equal(response.status, 200);
    const cookie = response.headers.get("set-cookie").split(";")[0],
      csrf = response.data.csrf;
    return {
      cookie,
      csrf,
      request: (path, options = {}) =>
        request(path, { cookie, csrf, ...options }),
    };
  }
  return { ...f, server, origin, request, client };
}
test("HTTP autenticação: cookies protegidos, senha derivada, login incorreto, logout e expiração", async (t) => {
  const f = await httpFixture(t);
  assert.equal((await f.request("/api/auth/me")).status, 401);
  const login = await f.request("/api/auth/login", {
    method: "POST",
    body: { alias: f.alice.alias, password: PASSWORD },
  });
  assert.equal(login.status, 200);
  assert.match(login.headers.get("set-cookie"), /HttpOnly/);
  assert.match(login.headers.get("set-cookie"), /SameSite=Strict/);
  assert.equal(login.headers.get("cache-control"), "no-store");
  assert.equal(JSON.stringify(login.data).includes("password_hash"), false);
  const wrong = await f.request("/api/auth/login", {
    method: "POST",
    body: { alias: f.alice.alias, password: "wrong-lab-only-pass" },
  });
  assert.equal(wrong.status, 401);
  const client = await f.client(f.alice);
  assert.equal((await client.request("/api/auth/me")).status, 200);
  assert.equal(
    (await client.request("/api/auth/logout", { method: "POST", body: {} }))
      .status,
    200,
  );
  assert.equal((await client.request("/api/auth/me")).status, 401);
  const other = await f.client(f.bob);
  f.advance(8 * 3600000 + 1);
  assert.equal((await other.request("/api/auth/me")).status, 401);
  const rows = f.db.prepare("SELECT password_hash FROM users").all();
  assert(
    rows.every(
      (r) =>
        r.password_hash.startsWith("scrypt:") &&
        !r.password_hash.includes(PASSWORD),
    ),
  );
  assert.equal(
    f.db
      .prepare("SELECT payload FROM audit_events")
      .all()
      .some((r) => r.payload.includes(PASSWORD)),
    false,
  );
});
test("HTTP origem, CSRF, JSON e campos administrativos adulterados são recusados", async (t) => {
  const f = await httpFixture(t),
    alice = await f.client(f.alice);
  assert.equal(
    (
      await alice.request(`/api/sessions/${f.sessionId}/accounts`, {
        method: "POST",
        body: { name: "Conta fictícia" },
        csrf: "wrong",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await alice.request(`/api/sessions/${f.sessionId}/accounts`, {
        method: "POST",
        body: { name: "Conta fictícia" },
        requestOrigin: "https://untrusted.invalid",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await alice.request(`/api/sessions/${f.sessionId}/accounts`, {
        method: "POST",
        body: { name: "Conta fictícia", balance: 999999 },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await f.request("/api/auth/register", {
        method: "POST",
        body: {
          alias: "forged",
          password: PASSWORD,
          consent: true,
          role: "admin",
        },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await alice.request("/api/sessions", {
        method: "POST",
        body: { name: "Escalação" },
      })
    ).status,
    403,
  );
  const raw = await fetch(f.origin + "/api/auth/login", {
    method: "POST",
    headers: { Origin: f.origin, "Content-Type": "text/plain" },
    body: "test",
  });
  assert.equal(raw.status, 415);
});
test("HTTP autorização aplica propriedade e protege pesquisa, exportação e sessões alheias", async (t) => {
  const f = await httpFixture(t),
    alice = await f.client(f.alice),
    outsider = await f.client(f.outsider);
  for (const route of [
    `/api/accounts/${f.b.id}`,
    `/api/accounts/${f.b.id}/statement`,
    `/api/sessions/${f.sessionId}/research`,
    `/api/sessions/${f.sessionId}/export?format=json`,
    `/api/sessions/${f.sessionId}/scenarios`,
    `/api/sessions/${f.sessionId}/runs`,
  ])
    assert.equal((await alice.request(route)).status, 403, route);
  assert.equal(
    (await outsider.request(`/api/sessions/${f.sessionId}`)).status,
    403,
  );
  const response = await alice.request(`/api/sessions/${f.sessionId}/lookup`, {
    method: "POST",
    body: { key: f.b.keys[0].value },
  });
  assert.equal(response.status, 200);
  assert.equal("balanceCents" in response.data, false);
  assert.equal("ownerId" in response.data, false);
  assert.equal("truth" in response.data, false);
});
test("HTTP duas autorizações simultâneas preservam débito/crédito e idempotência", async (t) => {
  const f = await httpFixture(t),
    alice = await f.client(f.alice),
    bob = await f.client(f.bob);
  async function draft() {
    let response = await alice.request(`/api/sessions/${f.sessionId}/drafts`, {
      method: "POST",
      body: { sourceId: f.a.id, key: f.b.keys[0].value, amountCents: 150000 },
    });
    assert.equal(response.status, 201);
    response = await alice.request(`/api/drafts/${response.data.id}/evaluate`, {
      method: "POST",
      body: {},
    });
    assert.equal(response.status, 200);
    return response.data;
  }
  const one = await draft(),
    two = await draft();
  const results = await Promise.all(
    [one, two].map((d, i) =>
      alice.request(`/api/drafts/${d.id}/authorize`, {
        method: "POST",
        body: { demoCode: "0000" },
        idem: "http-parallel-" + i,
      }),
    ),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  const success = results.find((r) => r.status === 200);
  assert.equal(
    (await alice.request("/api/accounts/" + f.a.id)).data.balanceCents,
    50000,
  );
  assert.equal(
    (await bob.request("/api/accounts/" + f.b.id)).data.balanceCents,
    250000,
  );
  const repeated = await alice.request(
    `/api/drafts/${results[0].status === 200 ? one.id : two.id}/authorize`,
    { method: "POST", body: { demoCode: "0000" }, idem: "another-retry-key" },
  );
  assert.equal(repeated.data.id, success.data.id);
  assert.equal(
    (await bob.request("/api/transfers/" + success.data.id)).status,
    200,
  );
});
test("HTTP falha de armazenamento retorna erro sem sucesso nem débito parcial", async (t) => {
  const f = await httpFixture(t),
    alice = await f.client(f.alice);
  const created = await alice.request(`/api/sessions/${f.sessionId}/drafts`, {
    method: "POST",
    body: { sourceId: f.a.id, key: f.b.keys[0].value, amountCents: 10000 },
  });
  const d = created.data;
  await alice.request(`/api/drafts/${d.id}/evaluate`, {
    method: "POST",
    body: {},
  });
  f.db.exec(
    `CREATE TRIGGER storage_error BEFORE INSERT ON ledger_entries WHEN NEW.account_id='${f.b.id}' AND NEW.delta_cents=10000 BEGIN SELECT RAISE(ABORT,'storage failure'); END;`,
  );
  const response = await alice.request(`/api/drafts/${d.id}/authorize`, {
    method: "POST",
    body: { demoCode: "0000" },
    idem: "http-failure-001",
  });
  assert.equal(response.status, 500);
  assert.equal(response.data.error.code, "INTERNAL");
  assert.equal("id" in response.data, false);
  assert.equal(f.lab.balance(f.a.id), 200000);
  assert.equal(f.lab.balance(f.b.id), 100000);
});
test("Servidor não expõe banco, código privado, propostas ou arquivos fora da lista pública", async (t) => {
  const f = await httpFixture(t);
  for (const route of [
    "/server/lab.cjs",
    "/.data/justec.sqlite",
    "/package.json",
    "/RELATORIO_MESTRE_JUSTEC.md",
    "/../.justec-bank-data/justec.sqlite",
    "/%2e%2e/server/security.cjs",
  ])
    assert.equal((await f.request(route)).status, 404, route);
  const page = await f.request("/laboratorio/");
  assert.equal(page.status, 200);
  assert.match(
    page.headers.get("content-security-policy"),
    /script-src 'self'/,
  );
  assert.equal(
    page.headers.get("content-security-policy").includes("unsafe-inline"),
    false,
  );
  assert.match(page.data, /Antes de transferir, confira/);
  assert.match(page.data, /SIMULAÇÃO ACADÊMICA/);
});
test("Sessões persistem através de nova conexão autenticada e não dependem de localStorage", async (t) => {
  const f = await httpFixture(t),
    alice = await f.client(f.alice);
  const created = await alice.request(`/api/sessions/${f.sessionId}/accounts`, {
    method: "POST",
    body: { name: "Outra conta fictícia", profile: "business" },
  });
  assert.equal(created.status, 201);
  const second = await f.client(f.alice),
    list = await second.request(`/api/sessions/${f.sessionId}/accounts`);
  assert.equal(list.status, 200);
  assert.equal(list.data.length, 2);
  assert(list.data.some((a) => a.id === created.data.id));
  assert.equal((await second.request("/api/sessions")).data.length, 1);
});

test("HTTPS configurado marca cookie Secure; corpo excessivo é recusado", async (t) => {
  const f = await httpFixture(t, { secure: true });
  const result = await f.request("/api/auth/login", {
    method: "POST",
    body: { alias: f.alice.alias, password: PASSWORD },
  });
  assert.equal(result.status, 200);
  assert.match(result.headers.get("set-cookie"), /; Secure/);
  const large = await f.request("/api/auth/register", {
    method: "POST",
    body: {
      alias: "oversized-user",
      password: "x".repeat(140000),
      consent: true,
    },
  });
  assert.equal(large.status, 413);
});
test("Limitação de tentativas de autenticação retorna 429 sem emitir credencial", async (t) => {
  const f = await httpFixture(t, { rateLimit: true });
  let last;
  for (let i = 0; i < 31; i++)
    last = await f.request("/api/auth/login", {
      method: "POST",
      body: { alias: "missing-user", password: "invalid-synthetic-password" },
    });
  assert.equal(last.status, 429);
  assert.equal(last.headers.get("set-cookie"), null);
  assert.equal(last.headers.get("retry-after"), "60");
});

test("Reinício do servidor preserva cookie autenticado, contas e transferência no arquivo", async (t) => {
  const f = await httpFixture(t),
    alice = await f.client(f.alice);
  let created = await alice.request(`/api/sessions/${f.sessionId}/drafts`, {
    method: "POST",
    body: { sourceId: f.a.id, key: f.b.keys[0].value, amountCents: 25000 },
  });
  const did = created.data.id;
  await alice.request(`/api/drafts/${did}/evaluate`, {
    method: "POST",
    body: {},
  });
  const transferred = await alice.request(`/api/drafts/${did}/authorize`, {
    method: "POST",
    body: { demoCode: "0000" },
    idem: "restart-0001",
  });
  assert.equal(transferred.status, 200);
  await new Promise((resolve) => f.server.close(resolve));
  f.db.close();
  const reopened = require("../server/db.cjs").openDatabase(f.filename),
    replacement = createServer(reopened, { now: f.clock, rateLimit: false });
  replacement.listen(0, "127.0.0.1");
  await once(replacement, "listening");
  try {
    const origin = `http://127.0.0.1:${replacement.address().port}`;
    const response = await fetch(origin + "/api/accounts/" + f.a.id, {
      headers: { Cookie: alice.cookie },
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).balanceCents, 175000);
    const receipt = await fetch(
      origin + "/api/transfers/" + transferred.data.id,
      { headers: { Cookie: alice.cookie } },
    );
    assert.equal(receipt.status, 200);
    assert.equal((await receipt.json()).id, transferred.data.id);
  } finally {
    await new Promise((resolve) => replacement.close(resolve));
    reopened.close();
  }
});
