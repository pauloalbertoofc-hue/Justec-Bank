const { DatabaseSync } = require("node:sqlite");
const fs = require("node:fs");
const path = require("node:path");
// PRAGMA journal_mode pode retornar SQLITE_BUSY sem respeitar busy_timeout.
// Retry limitado apenas na inicialização, nunca repetição de operação financeira.
function initializeSqlite(db) {
  db.exec("PRAGMA busy_timeout=10000; PRAGMA foreign_keys=ON;");
  const deadline = Date.now() + 10000;
  const signal = new Int32Array(new SharedArrayBuffer(4));
  for (;;) {
    try {
      db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;");
      return;
    } catch (error) {
      if (![5, 6].includes(error.errcode) || Date.now() >= deadline)
        throw error;
      Atomics.wait(signal, 0, 0, 25);
    }
  }
}
function openDatabase(filename) {
  if (filename !== ":memory:") {
    fs.mkdirSync(path.dirname(filename), { recursive: true, mode: 0o700 });
  }
  if (filename !== ":memory:") {
    try {
      fs.closeSync(fs.openSync(filename, "ax", 0o600));
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
    }
    fs.chmodSync(filename, 0o600);
  }
  const db = new DatabaseSync(filename);
  initializeSqlite(db);
  db.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations(version TEXT PRIMARY KEY, applied_at INTEGER NOT NULL) STRICT;",
  );
  for (const file of fs
    .readdirSync(path.join(__dirname, "migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    db.exec("BEGIN IMMEDIATE");
    try {
      if (
        db.prepare("SELECT 1 FROM schema_migrations WHERE version=?").get(file)
      ) {
        db.exec("COMMIT");
        continue;
      }
      db.exec(
        fs.readFileSync(path.join(__dirname, "migrations", file), "utf8"),
      );
      db.prepare("INSERT INTO schema_migrations VALUES(?,?)").run(
        file,
        Date.now(),
      );
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
  // Imutabilidade também no banco, não apenas na UI.
  for (const table of [
    "ledger_entries",
    "transfers",
    "evaluations",
    "audit_events",
    "review_decisions",
    "scenarios",
    "ground_truth",
    "snapshots",
    "account_observations",
    "attempt_observations",
    "run_operations",
    "observations",
    "participant_feedback",
  ]) {
    for (const verb of ["UPDATE", "DELETE"])
      db.exec(
        `CREATE TRIGGER IF NOT EXISTS immutable_${table}_${verb} BEFORE ${verb} ON ${table} BEGIN SELECT RAISE(ABORT,'immutable record'); END;`,
      );
  }
  if (filename !== ":memory:") fs.chmodSync(filename, 0o600);
  return db;
}
function atomic(db, fn) {
  if (db.driver === "postgres") return db.atomic(fn);
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    if (result && typeof result.then === "function")
      throw new Error("Callback assíncrono em transação SQLite síncrona.");
    db.exec("COMMIT");
    return result;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
async function openConfiguredDatabase(filename) {
  if (process.env.DATABASE_URL) {
    const { openPostgres } = require("./postgres.cjs");
    return openPostgres(process.env.DATABASE_URL, {
      allowInsecureLocal: process.env.PG_ALLOW_INSECURE_LOCAL === "1",
    });
  }
  if (
    process.env.RENDER === "true" &&
    !(
      process.env.JUSTEC_ALLOW_RENDER_SQLITE === "1" &&
      process.env.JUSTEC_DB_PATH
    )
  )
    throw new Error(
      "Configure DATABASE_URL: SQLite efêmero não é permitido no Render.",
    );
  return openDatabase(filename);
}
module.exports = { openDatabase, openConfiguredDatabase, atomic };
