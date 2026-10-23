const path = require("node:path");
const { openConfiguredDatabase } = require("./db.cjs");
const { createServer } = require("./http.cjs");
const { bootstrapAdmin } = require("./bootstrap-admin.cjs");
const dbPath = () =>
  path.resolve(
    process.env.JUSTEC_DB_PATH ||
      path.join(__dirname, "../../.justec-bank-data/justec.sqlite"),
  );
async function start() {
  const host = process.env.HOST || "127.0.0.1";
  const port = Number(process.env.PORT || 3000);
  const origin =
    process.env.PUBLIC_ORIGIN ||
    process.env.RENDER_EXTERNAL_URL ||
    `http://127.0.0.1:${port}`;
  if (
    host !== "127.0.0.1" &&
    host !== "localhost" &&
    !origin.startsWith("https://")
  )
    throw new Error(
      "Para acesso remoto, configure PUBLIC_ORIGIN HTTPS e proxy TLS.",
    );
  const parsed = new URL(origin);
  if (parsed.origin !== origin)
    throw new Error("PUBLIC_ORIGIN deve ser somente a origem, sem caminho.");
  const db = await openConfiguredDatabase(dbPath());
  try {
    // Render gratuito não disponibiliza Shell: segredo explícito permite bootstrap único.
    if (process.env.JUSTEC_ADMIN_PASSWORD) {
      await bootstrapAdmin(db, {
        alias: process.env.JUSTEC_ADMIN_ALIAS,
        password: process.env.JUSTEC_ADMIN_PASSWORD,
        skipExisting: true,
      });
      delete process.env.JUSTEC_ADMIN_PASSWORD;
    }
    const server = createServer(db, { origin });
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, host, resolve);
    });
    process.stdout.write(
      `JUSTEC — simulação acadêmica em ${origin}/laboratorio/\n`,
    );
    const close = () =>
      server.close(async () => {
        await db.close();
        process.exit(0);
      });
    process.on("SIGTERM", close);
    process.on("SIGINT", close);
    return server;
  } catch (error) {
    await db.close();
    throw error;
  }
}
if (require.main === module)
  start().catch(() => {
    // Nunca imprimir configuração, URL de conexão ou segredo de bootstrap.
    process.stderr.write(
      "Falha ao iniciar JUSTEC. Confira Node 24, origem HTTPS e configuração privada do banco/bootstrap.\n",
    );
    process.exitCode = 1;
  });
module.exports = { dbPath, start };
