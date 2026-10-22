const { DatabaseSync, backup } = require("node:sqlite");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { dbPath } = require("./index.cjs");
async function backupDatabase(source, destination) {
  const target = path.resolve(destination),
    root = path.resolve(__dirname, "..");
  if (target === root || target.startsWith(root + path.sep))
    throw new Error("Grave o backup fora da raiz pública do projeto.");
  if (fs.existsSync(target))
    throw new Error("Backup de destino já existe; não foi sobrescrito.");
  fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
  const temporary = path.join(
    path.dirname(target),
    `.justec-backup-${randomUUID()}.tmp`,
  );
  fs.closeSync(fs.openSync(temporary, "wx", 0o600));
  const db = new DatabaseSync(path.resolve(source), { readOnly: true });
  try {
    await backup(db, temporary);
    fs.linkSync(temporary, target);
    fs.chmodSync(target, 0o600);
    return target;
  } finally {
    db.close();
    fs.rmSync(temporary, { force: true });
  }
}
if (require.main === module) {
  const destination =
    process.env.JUSTEC_BACKUP_PATH || `${dbPath()}.backup-${Date.now()}`;
  backupDatabase(dbPath(), destination)
    .then(() =>
      process.stdout.write("Backup consistente criado em caminho privado.\n"),
    )
    .catch((e) => {
      process.stderr.write(e.message + "\n");
      process.exitCode = 1;
    });
}
module.exports = { backupDatabase };
