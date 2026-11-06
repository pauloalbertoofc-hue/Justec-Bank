const { Pool, types } = require("pg");
const { AsyncLocalStorage } = require("node:async_hooks");
const fs = require("node:fs");
const path = require("node:path");
// Mesmo contrato numérico do SQLite: nunca entregar bigint/numeric como string.
function safeNumber(value) {
  const result = Number(value);
  if (!Number.isSafeInteger(result))
    throw new Error("Inteiro PostgreSQL fora do contrato seguro.");
  return result;
}
function connectionOptions(
  connectionString,
  { allowInsecureLocal = false } = {},
) {
  const url = new URL(connectionString);
  if (!["postgres:", "postgresql:"].includes(url.protocol))
    throw new Error("DATABASE_URL deve usar PostgreSQL.");
  const local = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  if (allowInsecureLocal && !local)
    throw new Error(
      "TLS só pode ser desativado em PostgreSQL local de testes.",
    );
  for (const key of [
    "sslmode",
    "sslcert",
    "sslkey",
    "sslrootcert",
    "uselibpqcompat",
  ])
    url.searchParams.delete(key);
  return {
    connectionString: url.toString(),
    ssl: allowInsecureLocal ? false : { rejectUnauthorized: true },
    max: 4,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
    statement_timeout: 20000,
    query_timeout: 25000,
    types: {
      getTypeParser(oid, format) {
        return [20, 1700].includes(oid) && format !== "binary"
          ? safeNumber
          : types.getTypeParser(oid, format);
      },
    },
  };
}
function translate(sql) {
  // Dialeto comum intencionalmente pequeno, com parâmetros sempre vinculados.
  if (sql.includes("json_each(json_extract"))
    sql =
      "SELECT j.code AS code,COUNT(*) evaluations FROM evaluations e CROSS JOIN LATERAL json_array_elements_text((e.decision::json)->'codes') AS j(code) WHERE e.session_id=? GROUP BY j.code";
  if (/^\s*INSERT OR IGNORE\b/i.test(sql))
    sql =
      sql.replace(/INSERT OR IGNORE/i, "INSERT") + " ON CONFLICT DO NOTHING";
  sql = sql.replace(/WHERE alias=\?/g, "WHERE lower(alias)=lower(?)");
  // PostgreSQL normaliza aliases sem aspas; preservar as chaves da API existente.
  sql = sql.replace(
    /\b(runId|configHash|baselineHash|operationId|draftId|createdAt|amountCents|sourceId|snapshotHash|ownerId|limitCents|balanceCents|clearanceId|rulesVersion|actorId|entityId|accountId|deltaCents)\b/g,
    '"$1"',
  );
  sql = sql.replace(/\bl\.rowid\b/g, "l.entry_order");
  let position = 0,
    quoted = false,
    output = "";
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    if (char === "'" && quoted && sql[i + 1] === "'") {
      output += "''";
      i++;
      continue;
    }
    if (char === "'") quoted = !quoted;
    output += char === "?" && !quoted ? "$" + ++position : char;
  }
  return output;
}
class PostgresDatabase {
  constructor(pool) {
    this.pool = pool;
    this.context = new AsyncLocalStorage();
    this.driver = "postgres";
  }
  query(sql, args = []) {
    return (this.context.getStore() || this.pool).query(sql, args);
  }
  prepare(sql) {
    const query = (...args) => this.query(translate(sql), args);
    return {
      get: async (...args) => (await query(...args)).rows[0],
      all: async (...args) => (await query(...args)).rows,
      run: async (...args) => ({ changes: (await query(...args)).rowCount }),
    };
  }
  exec(sql) {
    return this.query(sql);
  }
  async atomic(fn) {
    if (this.context.getStore())
      throw new Error("Transação aninhada não permitida.");
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      // Serialização explícita das mutações do laboratório, inclusive entre processos.
      // READ COMMITTED renova o snapshot depois de aguardar o bloqueio.
      await client.query("SELECT pg_advisory_xact_lock(7123371001)");
      const value = await this.context.run(client, fn);
      await client.query("COMMIT");
      return value;
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {}
      throw error;
    } finally {
      client.release();
    }
  }
  close() {
    return (this.closePromise ||= this.pool.end());
  }
}
async function openPostgres(connectionString, options) {
  const pool = new Pool(connectionOptions(connectionString, options));
  pool.on("error", () =>
    process.stderr.write("Conexão PostgreSQL indisponível.\n"),
  );
  const db = new PostgresDatabase(pool);
  try {
    await db.atomic(async () => {
      await db.exec(
        "CREATE TABLE IF NOT EXISTS schema_migrations(version TEXT PRIMARY KEY,applied_at BIGINT NOT NULL)",
      );
      for (const file of fs
        .readdirSync(path.join(__dirname, "migrations-postgres"))
        .filter((f) => f.endsWith(".sql"))
        .sort()) {
        if (
          await db
            .prepare("SELECT 1 FROM schema_migrations WHERE version=?")
            .get(file)
        )
          continue;
        await db.exec(
          fs.readFileSync(
            path.join(__dirname, "migrations-postgres", file),
            "utf8",
          ),
        );
        await db
          .prepare("INSERT INTO schema_migrations VALUES(?,?)")
          .run(file, Date.now());
      }
      await db.exec(
        "CREATE OR REPLACE FUNCTION justec_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'immutable record'; END $$;",
      );
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
        const name = `immutable_${table}`;
        await db.exec(
          `DROP TRIGGER IF EXISTS ${name} ON ${table}; CREATE TRIGGER ${name} BEFORE UPDATE OR DELETE ON ${table} FOR EACH ROW EXECUTE FUNCTION justec_immutable();`,
        );
      }
    });
    return db;
  } catch (error) {
    await db.close();
    throw error;
  }
}
module.exports = { openPostgres, connectionOptions, translate, safeNumber };
