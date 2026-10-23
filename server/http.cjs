const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { Lab } = require("./lab.cjs");
const { attachResearch, examples } = require("./research.cjs");
const {
  LabError,
  fail,
  register,
  login,
  authenticate,
  equal,
} = require("./security.cjs");
attachResearch(Lab);
const ROOT = path.resolve(__dirname, "..");
function createServer(
  db,
  { origin, now, rateLimit = true, entrypoint = "bank" } = {},
) {
  const lab = new Lab(db, {
    ...(now
      ? {
          now,
        }
      : {}),
  });
  const limits = new Map();
  const server = http.createServer(async (req, res) => {
    let user = null;
    try {
      const expected =
        (typeof origin === "function" ? origin() : origin) ||
        `http://127.0.0.1:${server.address().port}`;
      const url = new URL(req.url, expected);
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Referrer-Policy", "same-origin");
      res.setHeader("X-Frame-Options", "DENY");
      res.setHeader(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=()",
      );
      const api = url.pathname.startsWith("/api/");
      if (api) {
        res.setHeader("Cache-Control", "no-store");
        if (req.headers.host !== new URL(expected).host)
          fail(403, "HOST", "Host não autorizado.");
        const action = /^\/api\/auth\/(login|register)$/.test(url.pathname)
          ? url.pathname
          : "api";
        if (rateLimit) {
          const key = `${req.socket.remoteAddress}:${action}`,
            time = Date.now();
          let entry = limits.get(key);
          if (!entry || time - entry.at > 60000) {
            entry = {
              at: time,
              count: 0,
            };
            limits.set(key, entry);
          }
          if (++entry.count > (action === "api" ? 600 : 30)) {
            res.setHeader("Retry-After", "60");
            fail(429, "RATE_LIMIT", "Aguarde antes de tentar novamente.");
          }
          if (limits.size > 10000)
            for (const [k, v] of limits)
              if (time - v.at > 60000) limits.delete(k);
        }
        const mutating = !["GET", "HEAD"].includes(req.method);
        if (mutating) {
          if (req.headers.origin !== expected)
            fail(403, "ORIGIN", "Origem não autorizada.");
          if (!req.headers["content-type"]?.startsWith("application/json"))
            fail(415, "CONTENT_TYPE", "Envie JSON.");
        }
        let body = {};
        if (mutating) {
          if (Number(req.headers["content-length"] || 0) > 131072) {
            req.resume();
            fail(413, "BODY_SIZE", "Requisição muito grande.");
          }
          const chunks = [];
          let size = 0;
          for await (const chunk of req) {
            size += chunk.length;
            if (size > 131072)
              fail(413, "BODY_SIZE", "Requisição muito grande.");
            chunks.push(chunk);
          }
          try {
            body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
          } catch {
            fail(400, "JSON", "JSON inválido.");
          }
        }
        if (
          mutating &&
          (!body || typeof body !== "object" || Array.isArray(body))
        )
          fail(400, "JSON_OBJECT", "Envie um objeto JSON.");
        const send = (value, status = 200) => {
          res.writeHead(status, {
            "Content-Type": "application/json; charset=utf-8",
          });
          res.end(JSON.stringify(value));
        };
        if (req.method === "GET" && url.pathname === "/api/health") {
          await db.prepare("SELECT 1").get();
          return send({
            simulation: true,
            version: "justec-lab/1.1.0",
            storage: db.driver || "sqlite",
          });
        }
        if (req.method === "POST" && url.pathname === "/api/auth/register") {
          const created = await register(db, body);
          await lab.audit(null, created.id, "auth.registered", created.id, {
            consentVersion: created.consentVersion,
          });
          return send(created, 201);
        }
        if (req.method === "POST" && url.pathname === "/api/auth/login") {
          const result = await login(db, body, now ? now() : Date.now());
          res.setHeader(
            "Set-Cookie",
            `justec_session=${result.secret}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${expected.startsWith("https:") ? "; Secure" : ""}`,
          );
          await lab.audit(null, result.user.id, "auth.login", result.user.id);
          return send({
            user: result.user,
            csrf: result.csrf,
          });
        }
        const secret = (req.headers.cookie || "")
          .split(";")
          .map((c) => c.trim())
          .find((c) => c.startsWith("justec_session="))
          ?.slice("justec_session=".length);
        user = await authenticate(db, secret, now ? now() : Date.now());
        if (mutating && !equal(user.csrf, req.headers["x-csrf-token"]))
          fail(403, "CSRF", "Atualize o acesso e tente novamente.");
        if (req.method === "GET" && url.pathname === "/api/auth/me")
          return send({
            user: {
              id: user.id,
              alias: user.alias,
              globalRole: user.globalRole,
              consentVersion: user.consentVersion,
            },
            csrf: user.csrf,
          });
        if (req.method === "POST" && url.pathname === "/api/auth/logout") {
          await db
            .prepare("DELETE FROM auth_sessions WHERE token_hash=?")
            .run(user.tokenHash);
          res.setHeader(
            "Set-Cookie",
            `justec_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${expected.startsWith("https:") ? "; Secure" : ""}`,
          );
          return send({
            loggedOut: true,
          });
        }
        const parts = url.pathname
          .slice("/api/".length)
          .split("/")
          .map((p) => decodeURIComponent(p));
        const [resource, rid, sub, subid] = parts;
        const method = req.method;
        if (resource === "sessions" && parts.length === 1) {
          if (method === "GET") return send(await lab.sessionList(user));
          if (method === "POST")
            return send(await lab.createSession(user, body), 201);
        }
        if (resource === "join" && parts.length === 1 && method === "POST")
          return send(await lab.join(user, body));
        if (resource === "sessions" && parts.length === 2) {
          if (method === "GET") return send(await lab.session(user, rid));
          if (method === "PATCH")
            return send(await lab.updateSession(user, rid, body));
        }
        if (resource === "sessions" && parts.length === 3) {
          if (sub === "members" && method === "GET")
            return send(await lab.members(user, rid));
          if (sub === "invitations" && method === "POST")
            return send(await lab.invite(user, rid, body), 201);
          if (sub === "accounts") {
            if (method === "GET") return send(await lab.accounts(user, rid));
            if (method === "POST")
              return send(await lab.createAccount(user, rid, body), 201);
          }
          if (sub === "lookup" && method === "POST")
            return send(await lab.lookup(user, rid, body.key));
          if (sub === "drafts") {
            if (method === "POST")
              return send(await lab.createDraft(user, rid, body), 201);
            if (method === "GET") return send(await lab.drafts(user, rid));
          }
          if (sub === "tasks" && method === "GET")
            return send(await lab.tasks(user, rid));
          if (sub === "reviews" && method === "GET")
            return send(await lab.reviews(user, rid));
          if (sub === "scenarios") {
            if (method === "GET") return send(await lab.scenarios(user, rid));
            if (method === "POST")
              return send(await lab.createScenario(user, rid, body), 201);
          }
          if (sub === "runs" && method === "GET")
            return send(await lab.runs(user, rid));
          if (sub === "snapshots") {
            if (method === "GET") return send(await lab.snapshots(user, rid));
            if (method === "POST")
              return send(await lab.snapshot(user, rid, body), 201);
          }
          if (sub === "observations" && method === "POST")
            return send(await lab.note(user, rid, body), 201);
          if (sub === "research" && method === "GET")
            return send(await lab.overview(user, rid));
          if (sub === "examples" && method === "GET") {
            await lab.member(user, rid, ["admin", "researcher"]);
            return send(examples());
          }
          if (sub === "export" && method === "GET") {
            const format = url.searchParams.get("format") || "json",
              out = await lab.exportResearch(user, rid, format);
            res.writeHead(200, {
              "Content-Type": out.contentType,
              "Content-Disposition": `attachment; filename="justec-research.${format === "csv" ? "csv" : "json"}"`,
            });
            return res.end(out.body);
          }
        }
        if (
          resource === "sessions" &&
          sub === "members" &&
          parts.length === 4 &&
          method === "PATCH"
        )
          return send(await lab.setRole(user, rid, subid, body));
        if (
          resource === "sessions" &&
          sub === "scenarios" &&
          parts.length === 5 &&
          parts[4] === "runs" &&
          method === "POST"
        )
          return send(await lab.startRun(user, rid, subid, body), 201);
        if (resource === "accounts" && parts.length === 2) {
          if (method === "GET") return send(await lab.account(user, rid));
          if (method === "PATCH")
            return send(await lab.configureAccount(user, rid, body));
        }
        if (resource === "accounts" && parts.length === 3) {
          if (sub === "keys" && method === "POST")
            return send(await lab.addKey(user, rid), 201);
          if (sub === "allocation" && method === "POST")
            return send(await lab.allocate(user, rid, body), 201);
          if (sub === "statement" && method === "GET")
            return send(
              await lab.statement(
                user,
                rid,
                Object.fromEntries(url.searchParams),
              ),
            );
        }
        if (resource === "keys" && parts.length === 2) {
          if (method === "DELETE")
            return send(
              await lab.changeKey(user, rid, {
                remove: true,
              }),
            );
          if (method === "PATCH") return send(await lab.changeKey(user, rid));
        }
        if (resource === "drafts" && parts.length === 2 && method === "GET")
          return send(await lab.draft(user, rid));
        if (resource === "drafts" && parts.length === 3 && method === "POST") {
          if (sub === "feedback")
            return send(await lab.feedback(user, rid, body), 201);
          if (sub === "revise")
            return send(await lab.reviseDraft(user, rid), 201);
          if (sub === "evaluate")
            return send(await lab.evaluateDraft(user, rid, body));
          if (sub === "authorize")
            return send(
              await lab.authorize(
                user,
                rid,
                body,
                req.headers["idempotency-key"],
              ),
            );
          if (sub === "cancel")
            return send(await lab.cancelDraft(user, rid, body));
          if (sub === "reviews")
            return send(await lab.requestReview(user, rid, body), 201);
        }
        if (
          resource === "evaluations" &&
          parts.length === 2 &&
          method === "GET"
        )
          return send(await lab.evaluation(user, rid));
        if (resource === "transfers" && parts.length === 2 && method === "GET")
          return send(await lab.receipt(user, rid));
        if (resource === "reviews" && parts.length === 3 && method === "POST") {
          if (sub === "resolve")
            return send(await lab.resolveReview(user, rid, body));
          if (sub === "followup")
            return send(await lab.followup(user, rid), 201);
        }
        if (
          resource === "tasks" &&
          sub === "draft" &&
          parts.length === 3 &&
          method === "POST"
        )
          return send(await lab.taskDraft(user, rid, body), 201);
        if (
          resource === "runs" &&
          sub === "repeat" &&
          parts.length === 3 &&
          method === "POST"
        )
          return send(await lab.repeatRun(user, rid), 201);
        if (
          resource === "snapshots" &&
          sub === "restore" &&
          parts.length === 3 &&
          method === "POST"
        )
          return send(await lab.restore(user, rid, body), 201);
        fail(404, "ROUTE", "Rota inexistente.");
      }
      if (!["GET", "HEAD"].includes(req.method))
        fail(405, "METHOD", "Método não permitido.");
      if (
        entrypoint === "bank" &&
        ["/", "/index.html"].includes(url.pathname)
      ) {
        res.writeHead(302, {
          Location: "/laboratorio/" + url.search,
          "Cache-Control": "no-store",
        });
        return res.end();
      }
      let relative = decodeURIComponent(url.pathname).replace(/^\//, "");
      if (!relative || relative === "demonstracao.html")
        relative = "index.html";
      if (relative === "laboratorio" || relative === "laboratorio/")
        relative = "laboratorio/index.html";
      if (
        !["index.html"].includes(relative) &&
        !/^(css|js|laboratorio)\/[a-zA-Z0-9_./-]+\.(css|js|html)$/.test(
          relative,
        )
      )
        fail(404, "FILE", "Arquivo inexistente.");
      const filename = path.resolve(ROOT, relative);
      if (
        !filename.startsWith(ROOT + path.sep) ||
        !fs.existsSync(filename) ||
        !fs.statSync(filename).isFile() ||
        !fs.realpathSync(filename).startsWith(ROOT + path.sep)
      )
        fail(404, "FILE", "Arquivo inexistente.");
      if (relative.startsWith("laboratorio/"))
        res.setHeader(
          "Content-Security-Policy",
          "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
        );
      const mime = {
        ".html": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "application/javascript; charset=utf-8",
      };
      res.writeHead(200, {
        "Content-Type": mime[path.extname(filename)],
        "Cache-Control": "no-cache",
      });
      if (req.method === "HEAD") return res.end();
      fs.createReadStream(filename).pipe(res);
    } catch (error) {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      const known = error instanceof LabError;
      const status = known ? error.status : 500;
      if (user && status >= 400) {
        try {
          const segments = new URL(req.url, "http://localhost").pathname.split(
            "/",
          );
          let sid = null;
          if (segments[2] === "sessions") sid = segments[3];
          else if (segments[2] === "drafts")
            sid = (
              await db
                .prepare(
                  "SELECT session_id FROM drafts WHERE id=? AND actor_id=?",
                )
                .get(segments[3] || "", user.id)
            )?.session_id;
          else if (segments[2] === "accounts")
            sid = (
              await db
                .prepare(
                  "SELECT session_id FROM accounts WHERE id=? AND owner_id=?",
                )
                .get(segments[3] || "", user.id)
            )?.session_id;
          if (
            sid &&
            !(await db
              .prepare(
                "SELECT 1 FROM memberships WHERE session_id=? AND user_id=?",
              )
              .get(sid, user.id))
          )
            sid = null;
          await lab.audit(
            sid,
            user.id,
            status === 403
              ? "security.denied"
              : status >= 500
                ? "operation.failed"
                : "operation.rejected",
            null,
            {
              code: known ? error.code : "INTERNAL",
              path: segments.slice(0, 4).join("/").slice(0, 200),
            },
          );
        } catch {}
      }
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.end(
        JSON.stringify({
          error: {
            code: known ? error.code : "INTERNAL",
            message: known
              ? error.message
              : "Falha interna. A operação não foi confirmada.",
          },
        }),
      );
    }
  });
  server.requestTimeout = 30000;
  server.headersTimeout = 15000;
  server.lab = lab;
  return server;
}
module.exports = {
  createServer,
};
