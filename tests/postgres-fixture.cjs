const { Pool } = require("pg");
const { randomUUID } = require("node:crypto");
const { openPostgres, connectionOptions } = require("../server/postgres.cjs");
const { Lab } = require("../server/lab.cjs");
const { attachResearch } = require("../server/research.cjs");
const security = require("../server/security.cjs");
attachResearch(Lab);
const PASSWORD = "only-synthetic-lab-test-password";
async function fixture(t, { pauseMs = 0, empty = false } = {}) {
  const url = process.env.JUSTEC_TEST_POSTGRES_URL;
  if (!url)
    throw new Error(
      "Defina JUSTEC_TEST_POSTGRES_URL para PostgreSQL de testes. Os ensaios criam/removem apenas schemas isolados.",
    );
  const allowInsecureLocal = process.env.JUSTEC_TEST_PG_LOCAL === "1";
  const root = new Pool(connectionOptions(url, { allowInsecureLocal }));
  const schema = "justec_test_" + randomUUID().replaceAll("-", "");
  await root.query(`CREATE SCHEMA ${schema}`);
  const scoped = new URL(url);
  scoped.searchParams.set("options", `-c search_path=${schema},public`);
  let db;
  t.after(async () => {
    try {
      if (db) await db.close();
    } finally {
      try {
        await root.query(`DROP SCHEMA ${schema} CASCADE`);
      } finally {
        await root.end();
      }
    }
  });
  db = await openPostgres(scoped.toString(), { allowInsecureLocal });
  const reconnect = () =>
    openPostgres(scoped.toString(), { allowInsecureLocal });
  if (empty) return { db, reconnect, connectionString: scoped.toString() };
  let clock = Date.now();
  const lab = new Lab(db, { now: () => clock });
  const register = (alias, role) =>
    security.register(db, { alias, password: PASSWORD, consent: true }, role);
  const admin = await register("research-admin", "admin");
  const alice = await register("participant-a");
  const bob = await register("participant-b");
  const outsider = await register("uninvited-user");
  const session = await lab.createSession(admin, {
    name: "Sessão acadêmica de teste",
    config: { initialCents: 200000, pauseMs },
  });
  for (const user of [alice, bob]) {
    const invite = await lab.invite(admin, session.id, { role: "participant" });
    await lab.join(user, { code: invite.code });
  }
  const a = await lab.createAccount(alice, session.id, {
    name: "Ana — fictícia",
    profile: "person",
  });
  await lab.updateSession(admin, session.id, {
    config: { initialCents: 100000, pauseMs },
  });
  const b = await lab.createAccount(bob, session.id, {
    name: "Robson — fictício",
    profile: "person",
  });
  return {
    db,
    lab,
    admin,
    alice,
    bob,
    outsider,
    sessionId: session.id,
    a,
    b,
    clock: () => clock,
    advance: (ms) => {
      clock += ms;
    },
    reconnect: () => openPostgres(scoped.toString(), { allowInsecureLocal }),
  };
}
async function draft(f, amountCents = 25000, extra = {}) {
  return f.lab.createDraft(f.alice, f.sessionId, {
    sourceId: f.a.id,
    key: f.b.keys[0].value,
    amountCents,
    ...extra,
  });
}
async function evaluated(f, amountCents = 25000) {
  const d = await draft(f, amountCents);
  return f.lab.evaluateDraft(f.alice, d.id, {});
}
module.exports = { fixture, draft, evaluated, PASSWORD };
