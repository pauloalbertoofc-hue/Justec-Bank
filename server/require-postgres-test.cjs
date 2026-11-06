const { spawn } = require("node:child_process");
if (!process.env.JUSTEC_TEST_POSTGRES_URL) {
  process.stderr.write(
    "Defina JUSTEC_TEST_POSTGRES_URL para o PostgreSQL de testes.\n",
  );
  process.exitCode = 1;
} else {
  const child = spawn(process.execPath, ["tests/lab-browser.cjs"], {
    stdio: "inherit",
    env: process.env,
  });
  child.once("exit", (code) => {
    process.exitCode = code ?? 1;
  });
  child.once("error", () => {
    process.stderr.write("Falha ao iniciar ensaio de navegador.\n");
    process.exitCode = 1;
  });
}
