const { openConfiguredDatabase } = require("./db.cjs");
const { dbPath } = require("./index.cjs");
const { bootstrapAdmin } = require("./bootstrap-admin.cjs");
(async () => {
  if (!process.env.JUSTEC_ADMIN_PASSWORD)
    throw new Error(
      "Defina JUSTEC_ADMIN_PASSWORD com senha exclusiva de pelo menos 12 caracteres.",
    );
  const db = await openConfiguredDatabase(dbPath());
  try {
    await bootstrapAdmin(db, {
      alias: process.env.JUSTEC_ADMIN_ALIAS,
      password: process.env.JUSTEC_ADMIN_PASSWORD,
    });
    process.stdout.write(
      "Administrador acadêmico criado. Nenhuma senha foi impressa.\n",
    );
  } finally {
    await db.close();
  }
})().catch((error) => {
  process.stderr.write(
    error.code
      ? "Falha de conexão ou gravação no banco. Verifique a configuração privada.\n"
      : `${error.message}\n`,
  );
  process.exitCode = 1;
});
