const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { Worker } = require("node:worker_threads");
const { fixture, evaluated, PASSWORD } = require("./lab-fixture.cjs");
const { backupDatabase } = require("../server/backup.cjs");
const { openDatabase } = require("../server/db.cjs");
test("Backup SQLite consistente conserva lançamentos e nunca sobrescreve destino", async (t) => {
  const f = await fixture(t, { file: true }),
    d = evaluated(f);
  f.lab.authorize(f.alice, d.id, { demoCode: "0000" }, "backup-001");
  const filename = path.join(path.dirname(f.filename), "snapshot.sqlite");
  await backupDatabase(f.filename, filename);
  const copy = openDatabase(filename);
  try {
    assert.equal(
      copy.prepare("PRAGMA integrity_check").get().integrity_check,
      "ok",
    );
    assert.equal(
      copy
        .prepare(
          "SELECT SUM(delta_cents) n FROM ledger_entries WHERE account_id=?",
        )
        .get(f.a.id).n,
      175000,
    );
    assert.equal(
      copy.prepare("SELECT COUNT(*) n FROM transfers WHERE kind='pix'").get().n,
      1,
    );
  } finally {
    copy.close();
  }
  await assert.rejects(() => backupDatabase(f.filename, filename), /já existe/);
  await assert.rejects(
    () =>
      backupDatabase(
        f.filename,
        path.join(__dirname, "../.data/unsafe-backup.sqlite"),
      ),
    /fora da raiz pública/,
  );
  if (process.platform !== "win32")
    assert.equal(fs.statSync(filename).mode & 0o777, 0o600);
});
test("Bootstrap exige credencial exclusiva, cria administrador uma vez e não imprime senha", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "justec-bootstrap-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const filename = path.join(dir, "lab.sqlite");
  const env = {
    ...process.env,
    JUSTEC_DB_PATH: filename,
    JUSTEC_ADMIN_ALIAS: "synthetic-admin",
    JUSTEC_ADMIN_PASSWORD: PASSWORD,
  };
  const output = execFileSync(process.execPath, ["server/bootstrap.cjs"], {
    cwd: path.resolve(__dirname, ".."),
    env,
    encoding: "utf8",
  });
  assert.equal(output.includes(PASSWORD), false);
  const db = openDatabase(filename);
  try {
    assert.equal(
      db.prepare("SELECT COUNT(*) n FROM users WHERE global_role='admin'").get()
        .n,
      1,
    );
  } finally {
    db.close();
  }
  assert.throws(() =>
    execFileSync(process.execPath, ["server/bootstrap.cjs"], {
      cwd: path.resolve(__dirname, ".."),
      env,
      stdio: "pipe",
    }),
  );
});
test("Migrações simultâneas são serializadas e registradas uma única vez", async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "justec-migrate-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, "lab.sqlite");
  const code = `const {parentPort,workerData:w}=require('node:worker_threads');try{const db=require(w.module).openDatabase(w.file);parentPort.postMessage({count:db.prepare('SELECT COUNT(*) n FROM schema_migrations').get().n});db.close();}catch(e){parentPort.postMessage({error:e.message});}`;
  const workers = Array.from(
    { length: 2 },
    () =>
      new Worker(code, {
        eval: true,
        workerData: {
          module: path.resolve(__dirname, "../server/db.cjs"),
          file,
        },
      }),
  );
  const results = await Promise.all(
    workers.map(
      (w) =>
        new Promise((resolve, reject) => {
          w.once("message", resolve);
          w.once("error", reject);
        }),
    ),
  );
  await Promise.all(workers.map((w) => w.terminate()));
  assert.deepEqual(results, [{ count: 3 }, { count: 3 }]);
});
