const path = require("node:path");
const { openDatabase } = require("./db.cjs");
const { createServer } = require("./http.cjs");
const dbPath = () =>
  path.resolve(
    process.env.JUSTEC_DB_PATH ||
      path.join(__dirname, "../../.justec-bank-data/justec.sqlite"),
  );
if (require.main === module) {
  const host = process.env.HOST || "127.0.0.1",
    port = Number(process.env.PORT || 3000),
    origin = process.env.PUBLIC_ORIGIN || `http://127.0.0.1:${port}`;
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
  const db = openDatabase(dbPath()),
    server = createServer(db, { origin });
  server.listen(port, host, () =>
    process.stdout.write(
      `JUSTEC — simulação acadêmica em ${origin}/laboratorio/\n`,
    ),
  );
  const close = () =>
    server.close(() => {
      db.close();
      process.exit(0);
    });
  process.on("SIGTERM", close);
  process.on("SIGINT", close);
}
module.exports = { dbPath };
