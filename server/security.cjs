const crypto = require("node:crypto");
const { promisify } = require("node:util");
const scrypt = promisify(crypto.scrypt);
class LabError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
const fail = (status, code, message) => {
  throw new LabError(status, code, message);
};
const id = () => crypto.randomUUID();
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const token = () => crypto.randomBytes(32).toString("base64url");
const equal = (a, b) =>
  typeof a === "string" &&
  typeof b === "string" &&
  Buffer.byteLength(a) === Buffer.byteLength(b) &&
  crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
function text(value, label, min = 1, max = 120) {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.length > max ||
    /[\u0000-\u0008\u000b-\u001f]/.test(value)
  )
    fail(400, "INVALID_INPUT", `${label}: texto inválido.`);
  return value.trim();
}
function cents(value, allowZero = false) {
  if (
    !Number.isSafeInteger(value) ||
    value < (allowZero ? 0 : 1) ||
    value > 1000000000
  )
    fail(
      400,
      "INVALID_MONEY",
      "Informe centavos inteiros, positivos e dentro do limite virtual.",
    );
  return value;
}
function exact(body, allowed) {
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).some((k) => !allowed.includes(k))
  )
    fail(400, "INVALID_INPUT", "Campos inválidos ou não permitidos.");
  return body;
}
async function passwordHash(password) {
  if (
    typeof password !== "string" ||
    password.length < 12 ||
    password.length > 128
  )
    fail(
      400,
      "PASSWORD",
      "Use senha exclusiva do laboratório, de 12 a 128 caracteres.",
    );
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt:${salt}:${derived.toString("hex")}`;
}
async function passwordMatches(password, encoded) {
  if (typeof password !== "string" || password.length > 128) return false;
  const [scheme, salt, digest] = encoded.split(":");
  if (scheme !== "scrypt") return false;
  const derived = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return equal(derived.toString("hex"), digest);
}
function safeUser(row) {
  return {
    id: row.id,
    alias: row.alias,
    globalRole: row.global_role,
    consentVersion: row.consent_version,
  };
}
async function register(db, body, globalRole = "participant") {
  exact(body, ["alias", "password", "consent"]);
  const alias = text(body.alias, "Pseudônimo", 3, 32);
  if (!/^[a-z][a-z0-9_-]{2,31}$/i.test(alias) || body.consent !== true)
    fail(
      400,
      "CONSENT",
      "Use pseudônimo sintético (letras, números, _ ou -) e reconheça o caráter acadêmico.",
    );
  const encoded = await passwordHash(body.password);
  const uid = id();
  try {
    db.prepare("INSERT INTO users VALUES(?,?,?,?,?,?)").run(
      uid,
      alias,
      encoded,
      globalRole,
      "academic-v1",
      Date.now(),
    );
  } catch (e) {
    if (e.code?.startsWith("ERR_SQLITE"))
      fail(409, "ALIAS_EXISTS", "Pseudônimo indisponível.");
    throw e;
  }
  return safeUser(db.prepare("SELECT * FROM users WHERE id=?").get(uid));
}
async function login(db, body, now = Date.now()) {
  exact(body, ["alias", "password"]);
  const alias = text(body.alias, "Pseudônimo", 3, 32);
  const row = db.prepare("SELECT * FROM users WHERE alias=?").get(alias);
  // Mesmo trabalho de derivação para conta inexistente.
  const encoded =
    row?.password_hash ||
    "scrypt:00000000000000000000000000000000:" + "0".repeat(128);
  const valid = await passwordMatches(body.password, encoded);
  if (!row || !valid)
    fail(401, "LOGIN", "Credenciais do laboratório inválidas.");
  const secret = token(),
    csrf = token();
  db.prepare("INSERT INTO auth_sessions VALUES(?,?,?,?,?)").run(
    hash(secret),
    row.id,
    csrf,
    now + 8 * 3600000,
    now,
  );
  return { secret, csrf, user: safeUser(row) };
}
function authenticate(db, secret, now = Date.now()) {
  if (typeof secret !== "string" || secret.length > 100)
    fail(401, "AUTH", "Entre no laboratório.");
  const row = db
    .prepare(
      "SELECT u.*, a.csrf, a.token_hash FROM auth_sessions a JOIN users u ON u.id=a.user_id WHERE a.token_hash=? AND a.expires_at>?",
    )
    .get(hash(secret), now);
  if (!row) fail(401, "AUTH", "Sessão de acesso expirada. Entre novamente.");
  return { ...safeUser(row), csrf: row.csrf, tokenHash: row.token_hash };
}
module.exports = {
  LabError,
  fail,
  id,
  hash,
  token,
  equal,
  text,
  cents,
  exact,
  register,
  login,
  authenticate,
};
