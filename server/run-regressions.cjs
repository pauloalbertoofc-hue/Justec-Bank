// Servidor temporário próprio: os testes originais não precisam de banco real.
const { once } = require("node:events");
const { spawn } = require("node:child_process");
const { openDatabase } = require("./db.cjs");
const { createServer } = require("./http.cjs");
(async () => {
  const db = openDatabase(":memory:"),
    server = createServer(db, { rateLimit: false, entrypoint: "demo" });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    for (const name of [
      "balance",
      "statement",
      "pix",
      "pix-2",
      "pix-layout-sequence",
      "layout",
      "guard-content",
      "shortcuts",
      "consumer-guidance",
    ]) {
      process.stdout.write(`\nRegressão original: ${name}\n`);
      const child = spawn(process.execPath, [`tests/${name}.cjs`], {
        cwd: require("node:path").resolve(__dirname, ".."),
        env: {
          ...process.env,
          JUSTEC_TEST_URL: `http://127.0.0.1:${server.address().port}/`,
          JUSTEC_RESOURCE_BRIDGE: process.env.JUSTEC_RESOURCE_BRIDGE || "1",
        },
        stdio: "inherit",
      });
      const [code] = await once(child, "exit");
      if (code !== 0)
        throw new Error(`Regressão ${name} terminou com código ${code}.`);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
})().catch((e) => {
  process.stderr.write(e.message + "\n");
  process.exitCode = 1;
});
