const { register } = require("./security.cjs");
const { randomUUID } = require("node:crypto");
async function bootstrapAdmin(
  db,
  { alias = "pesquisador-admin", password, skipExisting = false } = {},
) {
  if (!password)
    throw new Error(
      "Defina JUSTEC_ADMIN_PASSWORD com senha exclusiva de pelo menos 12 caracteres.",
    );
  const create = async () => {
    if (
      await db.prepare("SELECT 1 FROM users WHERE global_role='admin'").get()
    ) {
      if (skipExisting) return null;
      throw new Error("Administrador inicial já existe. Não foi alterado.");
    }
    const user = await register(
      db,
      { alias, password, consent: true },
      "admin",
    );
    await db
      .prepare("INSERT INTO audit_events VALUES(?,?,?,?,?,?,?)")
      .run(
        randomUUID(),
        null,
        user.id,
        "bootstrap.admin",
        user.id,
        "{}",
        Date.now(),
      );
    return user;
  };
  return db.driver === "postgres" ? db.atomic(create) : create();
}
module.exports = { bootstrapAdmin };
