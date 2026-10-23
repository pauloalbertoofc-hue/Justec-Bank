const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { openDatabase } = require("../server/db.cjs");
const { Lab } = require("../server/lab.cjs");
const { attachResearch } = require("../server/research.cjs");
const security = require("../server/security.cjs");
attachResearch(Lab);
const PASSWORD = "only-synthetic-lab-test-password";
async function fixture(t, { file = false, pauseMs = 0 } = {}) {
  const dir = file
    ? fs.mkdtempSync(path.join(os.tmpdir(), "justec-lab-test-"))
    : null;
  const filename = dir ? path.join(dir, "lab.sqlite") : ":memory:";
  const db = openDatabase(filename);
  let clock = 1792666800000;
  const lab = new Lab(db, { now: () => clock });
  const admin = await security.register(
    db,
    { alias: "research-admin", password: PASSWORD, consent: true },
    "admin",
  );
  const alice = await security.register(db, {
    alias: "participant-a",
    password: PASSWORD,
    consent: true,
  });
  const bob = await security.register(db, {
    alias: "participant-b",
    password: PASSWORD,
    consent: true,
  });
  const outsider = await security.register(db, {
    alias: "uninvited-user",
    password: PASSWORD,
    consent: true,
  });
  const session = lab.createSession(admin, {
    name: "Sessão acadêmica de teste",
    config: { initialCents: 200000, pauseMs },
  });
  for (const user of [alice, bob])
    lab.join(user, {
      code: lab.invite(admin, session.id, { role: "participant" }).code,
    });
  const a = lab.createAccount(alice, session.id, {
    name: "Ana — fictícia",
    profile: "person",
  });
  lab.updateSession(admin, session.id, {
    config: { initialCents: 100000, pauseMs },
  });
  const b = lab.createAccount(bob, session.id, {
    name: "Robson — fictício",
    profile: "person",
  });
  const f = {
    db,
    lab,
    admin,
    alice,
    bob,
    outsider,
    sessionId: session.id,
    a,
    b,
    filename,
    clock: () => clock,
    advance: (ms) => {
      clock += ms;
    },
  };
  t.after(() => {
    try {
      db.close();
    } catch {}
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  });
  return f;
}
function draft(f, amountCents = 25000, extra = {}) {
  return f.lab.createDraft(f.alice, f.sessionId, {
    sourceId: f.a.id,
    key: f.b.keys[0].value,
    amountCents,
    ...extra,
  });
}
function evaluated(f, amountCents = 25000, extra = {}) {
  const d = draft(f, amountCents, extra);
  return f.lab.evaluateDraft(f.alice, d.id, {});
}
module.exports = { fixture, draft, evaluated, PASSWORD };
