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
    async function openView(page, view) {
      if (await page.locator("#admin-nav").isVisible()) {
        await page.locator(`[data-view=${view}]`).click();
        return;
      }
      if (["pix", "screening", "action-post", "rights"].includes(view)) {
        await page.locator(`#bank-nav [data-bank-view="${view}"]`).click();
        return;
      }
      await page.locator("#bank-nav [data-bank-view=home]").click();
      await page.locator("#bank-balance-card").waitFor();
      const labels = {
        accounts: "Minhas contas e chaves",
        statement: "Ver extrato ›",
        reviews: "Contestações",
        sessions: "Convites e ambientes",
        security: "Central de segurança",
        protection: "Verificar chave Pix",
      };
      if (view === "edu-center") {
        await openView(page, "security");
        await page
          .getByRole("button", { name: "Centro educativo", exact: true })
          .click();
        return;
      }
      if (view !== "home")
        await page
          .getByRole("button", { name: labels[view], exact: true })
          .click();
    }
    async function pageFor(user) {
      const context = await browser.newContext({
        viewport: { width: 390, height: 900 },
      });
      const page = await context.newPage();
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(base + "/", { waitUntil: "networkidle" });
      assert.equal(new URL(page.url()).pathname, "/laboratorio/");
      assert(await page.locator("#login-form").isVisible());
      assert.equal(await page.locator("#bank-nav").isVisible(), false);
      assert.equal(await page.locator("#home-security").count(), 0);
      await page.locator("#login-form [name=alias]").fill(user.alias);
      await page.locator("#login-form [name=password]").fill(PASSWORD);
      await page.locator("#login-form button[type=submit]").click();
      await page.waitForSelector("#home-security");
      if (user.id === f.alice.id) {
        assert.equal(await page.locator("#admin-switch").isVisible(), false);
        assert.equal(await page.locator("#admin-nav").isVisible(), false);
        assert.equal(await page.locator("#session-toolbar").isVisible(), false);
        assert.match(
          await page.locator("#bank-balance").innerText(),
          /2\.000,00/,
        );
        await page.locator("#bank-balance-toggle").click();
        assert.equal(
          await page.locator("#bank-balance").innerText(),
          "R$ ••••••",
        );
        assert.equal(await f.lab.balance(f.a.id), 200000);
        await page.locator("#bank-balance-toggle").click();
        assert.match(
          await page.locator("#bank-balance").innerText(),
          /2\.000,00/,
        );
        await page.screenshot({
          path: "/tmp/justec-bank-home-390.png",
          fullPage: true,
        });
      }
      if (user.globalRole === "admin")
        await page.locator("#admin-switch").click();
      else await openView(page, "accounts");
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
    await openView(page, "pix");
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
    await page.waitForSelector("#bank-balance-card");
    assert.match(await page.locator("#workspace").innerText(), /1\.750,00/);
    await bob.page.reload({ waitUntil: "networkidle" });
    await bob.page.waitForSelector("#bank-balance-card");
    assert.match(await bob.page.locator("#workspace").innerText(), /1\.250,00/);
    await openView(bob.page, "statement");
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
    await researcher.locator("#scenario-form").waitFor();
    assert.equal(await researcher.locator("#research-section-setup").isVisible(), true);
    assert.equal(await researcher.locator("#research-section-results").isVisible(), false);
    const countsBeforeGuide = (await f.db.prepare("SELECT COUNT(*) n FROM runs").get()).n;
    await researcher.getByText("Roteiro de demonstração com dados fictícios", { exact: true }).click();
    assert.match(await researcher.locator("#workspace").innerText(), /código demonstrativo 0000/);
    assert.equal((await f.db.prepare("SELECT COUNT(*) n FROM runs").get()).n, countsBeforeGuide);
    await researcher.getByText("Roteiro de demonstração com dados fictícios", { exact: true }).click();
    await researcher.locator('[data-research-section="results"]').focus();
    await researcher.keyboard.press("Enter");
    assert.equal(await researcher.locator('[data-research-section="results"]').getAttribute("aria-pressed"), "true");
    assert.equal(await researcher.locator("#research-section-setup").isVisible(), false);
    await researcher.locator('[data-research-section="setup"]').click();
    await researcher
      .getByRole("button", {
        name: "Adicionar quatro cenários fictícios",
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
    await researcher.locator('[data-research-section="results"]').click();
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
    assert.equal(exported.metrics.groups[0].journey.assigned, 1);
    assert.equal(exported.metrics.groups[0].journey.byLabel.legitimate.blocked, 1);
    assert.equal(exported.metrics.groups[0].pauseConfiguredMs, 40);
    await researcher.locator('[data-research-section="execution"]').click();
    const pairForm = researcher.locator('form[id^="pair-"]').filter({
      has: researcher.getByRole("heading", { name: "Par de pausa · Transferência legítima", exact: true }),
    });
    await pairForm.locator('[name=pause]').fill("250");
    assert.equal(await pairForm.locator('[name=observePause]').isChecked(), false);
    await pairForm.locator('[name=observePause]').check();
    await pairForm.locator('button[type=submit]').click();
    await researcher.locator(".run-pair-card").waitFor();
    const pairData = await researcher.evaluate(async sid =>
      (await fetch(`/api/sessions/${sid}/run-pairs`)).json(), f.sessionId);
    assert.equal(pairData.length, 1);
    assert.equal(pairData[0].control.pauseConfiguredMs, 0);
    assert.equal(pairData[0].paused.pauseConfiguredMs, 250);
    assert.equal(pairData[0].control.journey.notStarted, 1);
    assert.equal(pairData[0].paused.journey.notStarted, 1);
    await researcher.getByRole("button", { name: "Abrir execução sem espera", exact: true }).click();
    await researcher.locator("#create-account-form").waitFor();
    assert.equal(await researcher.locator("#session-select").inputValue(), pairData[0].control.sessionId);
    await researcher.bringToFront();
    const observation = event => researcher.waitForResponse(response =>
      response.url().endsWith("/pause-observations") && response.request().postDataJSON()?.event === event);
    await researcher.getByRole("button", { name: "Abrir operação atribuída", exact: true }).click();
    await researcher.locator("#workspace [name=checked]").check();
    const openedSignal = observation("opened");
    await researcher.getByRole("button", { name: "Continuar com JUSTEC Guard", exact: true }).click();
    assert.equal((await openedSignal).status(), 200);
    assert.match(await researcher.locator("#workspace").innerText(), /Registro experimental ativo/);
    const continuedSignal = observation("continue");
    await researcher.locator("#lab-pause-next").click();
    assert.equal((await continuedSignal).status(), 200);
    await researcher.locator("#workspace [name=demoCode]").fill("0000");
    await researcher.locator("#workspace [name=confirm]").check();
    await researcher.locator("#lab-authorize").click();
    await researcher.getByRole("heading", { name: "Pix realizado no laboratório", exact: true }).waitFor();
    await researcher.locator("#research-nav").click();
    await researcher.locator("#configuration-form").waitFor();
    await researcher.locator('#configuration-form [name=status]').selectOption("archived");
    const archiveResponse = researcher.waitForResponse(response => response.request().method() === "PATCH" && response.url().endsWith(`/sessions/${pairData[0].control.sessionId}`));
    await researcher.locator('#configuration-form button[type=submit]').click();
    assert.equal((await archiveResponse).status(), 200, "Arquivar execução não deve reenviar configuração congelada");
    await researcher.waitForFunction(() => document.querySelector("#session-status").textContent.includes("Arquivada"));
    await researcher.locator('#configuration-form [name=config]').waitFor();
    assert.equal(await researcher.locator('#configuration-form [name=config]').isEditable(), false);
    await researcher.locator("#session-select").selectOption(pairData[0].paused.sessionId);
    await researcher.locator("#create-account-form").waitFor();
    await researcher.route("**/api/drafts/*/pause-observations", route => route.fulfill({ status: 503, contentType: "application/json", body: '{"error":{"message":"synthetic observation failure"}}' }));
    await researcher.getByRole("button", { name: "Abrir operação atribuída", exact: true }).click();
    await researcher.locator("#workspace [name=checked]").check();
    const failedSignal = observation("opened");
    await researcher.getByRole("button", { name: "Continuar com JUSTEC Guard", exact: true }).click();
    assert.equal((await failedSignal).status(), 503);
    await researcher.locator("#lab-pause-next").click();
    await researcher.locator("#workspace [name=demoCode]").fill("0000");
    await researcher.locator("#workspace [name=confirm]").check();
    await researcher.locator("#lab-authorize").click();
    await researcher.getByRole("heading", { name: "Pix realizado no laboratório", exact: true }).waitFor();
    await researcher.unroute("**/api/drafts/*/pause-observations");
    const exposure = await researcher.evaluate(async sid => (await fetch(`/api/sessions/${sid}/pause-exposure`)).json(), f.sessionId);
    assert.equal(exposure.summary.openedVisits, 1);
    assert.equal(exposure.summary.continued, 1);
    const observedPair = await researcher.evaluate(async sid => (await fetch(`/api/sessions/${sid}/run-pairs`)).json(), f.sessionId);
    assert.equal(observedPair[0].control.pauseExposure.openedVisits, 1);
    assert.equal(observedPair[0].paused.pauseExposure.openedVisits, 0);
    assert.equal(observedPair[0].paused.pauseExposure.enabled, true);

    await researcher.locator("#session-select").selectOption(f.sessionId);
    await researcher.locator("#create-account-form").waitFor();
    await researcher.locator("#research-nav").click();
    await researcher.locator('[data-research-section="results"]').click();
    await researcher.locator(".run-pair-card").waitFor();
    for (const width of [320, 375, 390, 768, 1024, 1366, 1920]) {
      await researcher.setViewportSize({ width, height: 900 });
      for (const section of ["setup", "execution", "results"]) {
        await researcher.locator(`[data-research-section="${section}"]`).click();
        assert.equal(await researcher.locator(".research-section:visible").count(), 1);
        assert.equal(await researcher.locator(`#research-section-${section}`).isVisible(), true);
        assert.equal(await researcher.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `research/${section}/${width}`);
      }
      assert(await researcher.getByRole("heading", { name: "Todas as jornadas atribuídas", exact: true }).isVisible());
      assert.match(await researcher.locator(".study-journeys").innerText(), /Não iniciadas/);
      assert.match(await researcher.locator(".run-pair-card").innerText(), /250 ms/);
      assert.match(await researcher.locator(".pause-exposure-report").innerText(), /Intervalo médio entre recebimentos/);
      assert.equal(await researcher.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `research/${width}`);
    }
    await researcher.setViewportSize({ width: 390, height: 900 });
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
    assert.equal(await page.evaluate(async sid =>
      (await fetch(`/api/sessions/${sid}/run-pairs`)).status, f.sessionId), 403);
    for (const width of [320, 375, 390, 768, 1024, 1366, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      for (const view of [
        "home",
        "sessions",
        "accounts",
        "statement",
        "reviews",
        "screening",
        "action-post",
        "rights",
        "edu-center",
        "security",
        "protection",
      ]) {
        await openView(page, view);
        await page.waitForTimeout(100);
        if (view === "home") {
          const cards = await page.locator("#home-security").boundingBox();
          const balance = await page
            .locator("#bank-balance-card")
            .boundingBox();
          assert(cards.y + cards.height <= balance.y + 1);
        }
        if (view === "screening") {
          await page
            .getByRole("button", {
              name: "Ver Diagnóstico Rápido",
              exact: true,
            })
            .first()
            .click();
          assert(await page.locator("#bank-dialog").isVisible());
          await page.keyboard.press("Escape");
          assert.equal(await page.locator("#bank-dialog").isVisible(), false);
        }
        if (view === "action-post") {
          await page.getByRole("button", { name: /Gerar Roteiro/ }).click();
          assert(await page.locator("#bank-dialog").isVisible());
          await page
            .getByRole("button", { name: "Fechar", exact: true })
            .click();
        }
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth + 1,
          ),
          false,
          `${width}/${view}`,
        );
        assert(await page.locator("#bank-nav").isVisible());
        assert.equal(await page.locator("#admin-nav").isVisible(), false);
      }
      await openView(page, "pix");
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
    await openView(page, "accounts");
    await page.screenshot({
      path: "/tmp/justec-laboratory-accounts.png",
      fullPage: true,
    });
    await researcher.screenshot({
      path: "/tmp/justec-laboratory-research.png",
      fullPage: true,
    });
    await page.locator("#logout").click();
    await page.locator("#login-form").waitFor();
    assert.equal(await page.locator("#workspace").innerText(), "");
    assert.equal(await page.locator("#bank-nav").isVisible(), false);
    assert.equal(await page.locator("#identity").innerText(), "");
    assert.equal((await f.lab.accounts(f.alice, f.sessionId)).length, 2);
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
