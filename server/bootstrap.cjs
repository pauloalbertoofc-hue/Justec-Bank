const { openDatabase } = require("./db.cjs");
const { dbPath } = require("./index.cjs");
const { register } = require("./security.cjs");
(async () => {
  if (!process.env.JUSTEC_ADMIN_PASSWORD)
    throw new Error(
      "Defina JUSTEC_ADMIN_PASSWORD com senha exclusiva de pelo menos 12 caracteres.",
    );
  const db = openDatabase(dbPath());
  try {
    if (db.prepare("SELECT 1 FROM users WHERE global_role='admin'").get())
      throw new Error("Administrador inicial já existe. Não foi alterado.");
    const user = await register(
      db,
      {
        alias: process.env.JUSTEC_ADMIN_ALIAS || "pesquisador-admin",
        password: process.env.JUSTEC_ADMIN_PASSWORD,
        consent: true,
      },
      "admin",
    );
    db.prepare("INSERT INTO audit_events VALUES(?,?,?,?,?,?,?)").run(
      require("node:crypto").randomUUID(),
      null,
      user.id,
      "bootstrap.admin",
      user.id,
      "{}",
      Date.now(),
    );
    process.stdout.write(
      "Administrador acadêmico criado. Nenhuma senha foi impressa.\n",
    );
  } finally {
    db.close();
  }
})().catch((e) => {
  process.stderr.write(`${e.message}\n`);
  process.exitCode = 1;
});
