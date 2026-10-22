const test = require("node:test");
const assert = require("node:assert/strict");
const { flow, collect, wrapMethods } = require("../server/flow.cjs");
const {
  connectionOptions,
  translate,
  safeNumber,
} = require("../server/postgres.cjs");
test("Fluxo mantém retorno e exceção síncronos para SQLite", () => {
  const add = flow(function* (n) {
    return (yield n) + 1;
  });
  assert.equal(add(2), 3);
  const reject = flow(function* () {
    yield 1;
    throw new Error("invariant");
  });
  assert.throws(() => reject(), /invariant/);
});
test("Fluxo aguarda promessas e devolve rejeição ao try/catch/finally", async () => {
  const events = [];
  const fn = flow(function* () {
    try {
      yield Promise.reject(new Error("rollback"));
    } catch (e) {
      events.push(e.message);
      return yield Promise.resolve(42);
    } finally {
      events.push("finally");
    }
  });
  assert.equal(await fn(), 42);
  assert.deepEqual(events, ["rollback", "finally"]);
  await assert.rejects(
    flow(function* () {
      yield Promise.reject(new Error("fail"));
    }),
    /fail/,
  );
});
test("Coleta preserva ordem e métodos preservam this nos dois drivers", async () => {
  class Example {
    constructor(n) {
      this.n = n;
    }
    *value(x) {
      return this.n + (yield x);
    }
  }
  wrapMethods(Example);
  const obj = new Example(4);
  assert.equal(obj.value(2), 6);
  assert.equal(await obj.value(Promise.resolve(2)), 6);
  assert.deepEqual(collect([1, 2]), [1, 2]);
  assert.deepEqual(await collect([Promise.resolve(1), 2]), [1, 2]);
});
test("Conexão PostgreSQL força certificado TLS válido e restringe exceção local", () => {
  const c = connectionOptions(
    "postgres://test:synthetic@db.example.invalid/test?sslmode=no-verify",
  );
  assert.equal(c.ssl.rejectUnauthorized, true);
  assert(!c.connectionString.includes("sslmode"));
  assert.throws(
    () =>
      connectionOptions("postgres://test:synthetic@db.example.invalid/test", {
        allowInsecureLocal: true,
      }),
    /local/,
  );
  assert.equal(
    connectionOptions("postgres://test:synthetic@127.0.0.1/test", {
      allowInsecureLocal: true,
    }).ssl,
    false,
  );
});
test("Tradutor SQL preserva literais e vincula parâmetros sem interpolar valores", () => {
  assert.equal(
    translate(
      "SELECT '?' literal,? value,created_at createdAt FROM drafts WHERE id=?",
    ),
    "SELECT '?' literal,$1 value,created_at \"createdAt\" FROM drafts WHERE id=$2",
  );
  assert.match(
    translate("INSERT OR IGNORE INTO memberships VALUES(?,?,?,?)"),
    /ON CONFLICT DO NOTHING$/,
  );
  assert.match(
    translate("SELECT l.rowid FROM ledger_entries l"),
    /l.entry_order/,
  );
  assert.equal(safeNumber("248050"), 248050);
  assert.throws(() => safeNumber("9007199254740993"), /seguro/);
});

test("Render gratuito recusa ausência de PostgreSQL sem criar SQLite temporário", async () => {
  const { openConfiguredDatabase } = require("../server/db.cjs");
  const keys = [
    "RENDER",
    "DATABASE_URL",
    "JUSTEC_ALLOW_RENDER_SQLITE",
    "JUSTEC_DB_PATH",
  ];
  const previous = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  try {
    process.env.RENDER = "true";
    for (const key of keys.slice(1)) delete process.env[key];
    await assert.rejects(
      () => openConfiguredDatabase(":memory:"),
      /DATABASE_URL/,
    );
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
