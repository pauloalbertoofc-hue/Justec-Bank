const { DatabaseSync } = require("node:sqlite");
const fs = require("node:fs");
const path = require("node:path");
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
  db.exec(
    "PRAGMA foreign_keys=ON; PRAGMA busy_timeout=10000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;",
  );
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
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
module.exports = { openDatabase, atomic };
