const assert = require("node:assert/strict");
const { once } = require("node:events");
const { chromium } = require("playwright");
const { fixture, PASSWORD } = require(
  process.env.JUSTEC_TEST_POSTGRES_URL
    ? "./postgres-fixture.cjs"
    : "./lab-fixture.cjs",
);
const { createServer } = require("../server/http.cjs");
(async () => {
  const cleanups = [];
  const f = await fixture({ after: (fn) => cleanups.push(fn) }, { file: true });
  await f.lab.updateSession(f.admin, f.sessionId, {
    config: { initialCents: 100000, pauseMs: 5000 },
  });
  const server = createServer(f.db, { rateLimit: false });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const errors = [];
  try {
    async function pageFor(user) {
      const context = await browser.newContext({
        viewport: { width: 390, height: 900 },
      });
      const page = await context.newPage();
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(base + "/laboratorio/", { waitUntil: "networkidle" });
      await page.locator("#login-form [name=alias]").fill(user.alias);
      await page.locator("#login-form [name=password]").fill(PASSWORD);
      await page.locator("#login-form button[type=submit]").click();
      await page.waitForSelector("#create-account-form");
      return { context, page };
    }
    const alice = await pageFor(f.alice),
      bob = await pageFor(f.bob),
      admin = await pageFor(f.admin);
    const page = alice.page;
    assert.equal(await page.locator("#research-nav").isVisible(), false);
    await page
      .locator("#create-account-form [name=name]")
      .fill("Ana secundária — fictícia");
    await page
      .locator("#create-account-form [name=profile]")
      .selectOption("business");
    await page.locator("#create-account-form button[type=submit]").click();
    await page.waitForFunction(() =>
      document.querySelector("#workspace").innerText.includes("Ana secundária"),
    );
    assert.equal((await f.lab.accounts(f.alice, f.sessionId)).length, 2);
    await page.locator("[data-view=pix]").click();
    await page
      .getByRole("button", {
        name: "Transferir por chave fictícia",
        exact: true,
      })
      .click();
    await page.locator("#workspace [name=key]").fill(f.b.keys[0].value);
    await page
      .getByRole("button", { name: "Conferir destinatário", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Continuar para valor", exact: true })
      .click();
    await page.locator("#lab-value-form [name=amount]").fill("250,00");
    await page.locator("#lab-value-form button[type=submit]").click();
    await page.locator("#workspace [name=checked]").check();
    const realPauseStart = Date.now();
    await page
      .getByRole("button", { name: "Continuar com JUSTEC Guard", exact: true })
      .click();
    await page.waitForFunction(
      () =>
        document.querySelector("#lab-pause-next") &&
        !document.querySelector("#lab-pause-next").disabled,
    );
    assert(
      Date.now() - realPauseStart >= 4500,
      "Intervalo real configurado de cinco segundos",
    );
    assert.equal(await f.lab.balance(f.a.id), 200000);
    await page.locator("#lab-pause-next").click();
    await page.locator("#workspace [name=demoCode]").fill("0000");
    await page.locator("#workspace [name=confirm]").check();
    await page.locator("#lab-authorize").click();
    await page
      .getByRole("heading", {
        name: "Pix realizado no laboratório",
        exact: true,
      })
      .waitFor();
    assert.equal(await f.lab.balance(f.a.id), 175000);
    assert.equal(await f.lab.balance(f.b.id), 125000);
    await f.lab.updateSession(f.admin, f.sessionId, {
      config: { initialCents: 100000, pauseMs: 40 },
    });
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector("#create-account-form");
    assert.match(await page.locator("#workspace").innerText(), /1\.750,00/);
    await bob.page.reload({ waitUntil: "networkidle" });
    await bob.page.waitForSelector("#create-account-form");
    assert.match(await bob.page.locator("#workspace").innerText(), /1\.250,00/);
    await bob.page.locator("[data-view=statement]").click();
    await bob.page
      .getByRole("button", { name: "Detalhes / comprovante", exact: true })
      .first()
      .waitFor();
    assert.match(await bob.page.locator("#workspace").innerText(), /250,00/);
    const denied = await page.evaluate(
      async (id) => (await fetch("/api/accounts/" + id)).status,
      f.b.id,
    );
    assert.equal(denied, 403);
    const researcher = admin.page;
    await researcher.locator("#research-nav").click();
    await researcher
      .getByRole("button", {
        name: "Adicionar os quatro exemplos científicos",
        exact: true,
      })
      .click();
    await researcher.locator('form[id^="run-"]').nth(3).waitFor();
    const scenario = researcher.locator('form[id^="run-"]').filter({
      has: researcher.getByRole("heading", {
        name: "Falso positivo contextual",
        exact: true,
      }),
    });
    await scenario.locator("[name=pause]").fill("40");
    await scenario.locator("button[type=submit]").click();
    await researcher
      .getByRole("button", { name: "Abrir roteiro pix-1", exact: true })
      .waitFor();
    await researcher
      .getByRole("button", { name: "Abrir roteiro pix-1", exact: true })
      .click();
    await researcher.locator("#workspace [name=checked]").check();
    await researcher
      .getByRole("button", { name: "Continuar com JUSTEC Guard", exact: true })
      .click();
    await researcher.locator("#lab-context-form").waitFor();
    await researcher.locator("#lab-context-form [name=acknowledged]").check();
    await researcher.locator("#lab-context-form button[type=submit]").click();
    await researcher
      .getByRole("heading", { name: "Pix interrompido", exact: true })
      .waitFor();
    await researcher.locator("#session-select").selectOption(f.sessionId);
    await researcher.waitForSelector("#create-account-form");
    await researcher.locator("#research-nav").click();
    await researcher
      .getByRole("heading", { name: "Comparação experimental", exact: true })
      .waitFor();
    const downloadPromise = researcher.waitForEvent("download");
    await researcher
      .getByRole("button", { name: "Exportar JSON", exact: true })
      .click();
    const download = await downloadPromise;
    const path = await download.path();
    const exported = JSON.parse(require("node:fs").readFileSync(path, "utf8"));
    assert.equal(
      exported.metrics.groups.reduce((n, g) => n + g.FP, 0),
      1,
    );
    assert.equal(exported.executions.length, 1);
    assert.equal(JSON.stringify(exported).includes(PASSWORD), false);
    // Perfil participante não recebe rótulos experimentais nem endpoints de pesquisa.
    assert.equal(
      await page.evaluate(
        async (sid) => (await fetch(`/api/sessions/${sid}/research`)).status,
        f.sessionId,
      ),
      403,
    );
    for (const width of [320, 375, 390, 768, 1024, 1366, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      for (const view of ["sessions", "accounts", "statement", "reviews"]) {
        await page.locator(`[data-view=${view}]`).click();
        await page.waitForTimeout(100);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth + 1,
          ),
          false,
          `${width}/${view}`,
        );
        assert(
          await page
            .locator(".lab-education")
            .getByRole("link", { name: /Tenho dúvida/ })
            .isVisible(),
        );
        assert(
          await page
            .locator(".lab-education")
            .getByRole("link", { name: /Sofri um golpe/ })
            .isVisible(),
        );
      }
      await page.locator("[data-view=pix]").click();
      await page
        .getByRole("button", {
          name: "Transferir por chave fictícia",
          exact: true,
        })
        .click();
      await page.locator("#workspace [name=key]").fill(f.b.keys[0].value);
      await page
        .getByRole("button", { name: "Conferir destinatário", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Continuar para valor", exact: true })
        .click();
      await page.locator("#lab-value-form [name=amount]").fill("1,00");
      await page.locator("#lab-value-form button[type=submit]").click();
      await page.locator("#workspace [name=checked]").check();
      await page
        .getByRole("button", {
          name: "Continuar com JUSTEC Guard",
          exact: true,
        })
        .click();
      await page.waitForFunction(
        () =>
          document.querySelector("#lab-pause-next") &&
          !document.querySelector("#lab-pause-next").disabled,
      );
      const next = page.locator("#lab-pause-next");
      await next.evaluate((el) => el.scrollIntoView({ block: "center" }));
      const box = await next.boundingBox();
      assert(box.x >= 0 && box.x + box.width <= width + 1 && box.height >= 44);
      const header = await page.locator(".lab-header").boundingBox();
      assert(box.y >= header.y + header.height - 1);
      await next.click();
      await page.locator("#workspace [name=demoCode]").fill("0000");
      await page.locator("#workspace [name=confirm]").check();
      await page.locator("#lab-authorize").click();
      await page
        .getByRole("heading", {
          name: "Pix realizado no laboratório",
          exact: true,
        })
        .waitFor();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 1,
        ),
        false,
      );
      await page
        .getByRole("button", { name: "Voltar às contas", exact: true })
        .click();
      console.log(
        `PASS laboratório UI ${width}px: sessões, contas, extrato, revisões, educação e ausência de rolagem horizontal.`,
      );
    }
    const education = await alice.context.newPage();
    await require("./resources.cjs")(education);
    await education.goto(base + "/?screen=screening", {
      waitUntil: "networkidle",
    });
    assert(await education.locator("#screen-screening").isVisible());
    await education.close();
    await page.locator("[data-view=accounts]").click();
    await page.screenshot({
      path: "/tmp/justec-laboratory-accounts.png",
      fullPage: true,
    });
    await researcher.screenshot({
      path: "/tmp/justec-laboratory-research.png",
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(
      "PASS laboratório navegador: login real, múltiplas contas, Pix debitado/creditado, recarga persistente, extrato bilateral, papéis, cenário falso positivo, exportação e educação original.",
    );
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
    for (const cleanup of cleanups.reverse()) await cleanup();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
