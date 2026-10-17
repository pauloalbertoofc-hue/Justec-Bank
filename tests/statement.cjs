// Requer Playwright e Chromium disponíveis no ambiente de teste, sem build da aplicação.
// Sirva a raiz do projeto por HTTP antes de executar este arquivo.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
    const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
    try {
        const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(process.env.JUSTEC_TEST_URL || 'http://127.0.0.1:8000/', { waitUntil: 'networkidle' });
        const click = selector => page.locator(selector).dispatchEvent('click');
        const balance = () => page.locator('#balance-display').innerText();
        assert.match(await balance(), /2\.480,50/);
        const totals = await page.evaluate(() => calculateTotals(statementScenario.transactions));
        assert.deepEqual(totals, { incoming: 2650, outgoing: 1169.5, net: 1480.5 });
        assert.equal(await page.evaluate(() => new Set(statementScenario.transactions.map(t => t.id)).size), 12);
        await click('#balance-toggle');
        await click('.statement-link');
        assert.equal(await page.locator('#statement-balance').innerText(), 'R$ ••••••');
        assert.equal(await page.locator('#statement-list button').count(), 12);
        await click('#statement-balance-toggle');
        assert.match(await balance(), /2\.480,50/);
        assert.equal(await page.locator('#eye-icon').getAttribute('class'), 'fa-solid fa-eye');
        for (const [period, count] of [['7', 6], ['30', 9], ['90', 12]]) {
            await page.selectOption('#statement-period', period);
            assert.equal(await page.locator('#statement-list button').count(), count);
        }
        await page.selectOption('#statement-type', 'incoming');
        assert.equal(await page.locator('#statement-list button').count(), 4);
        assert.match(await page.locator('#statement-incoming').innerText(), /2\.650,00/);
        assert.match(await page.locator('#statement-outgoing').innerText(), /0,00/);
        await page.locator('#statement-list button').first().dispatchEvent('click');
        assert.equal(await page.locator('#receipt-dispute').evaluate(el => el.hidden), true);
        assert.equal(await page.locator('#statement-dialog').evaluate(el => el.open), true);
        await click('#receipt-copy');
        await page.waitForFunction(() => document.getElementById('receipt-feedback').textContent.includes('copiado'));
        assert.match(await page.evaluate(() => navigator.clipboard.readText()), /SIMULAÇÃO EDUCACIONAL — SEM VALIDADE BANCÁRIA/);
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#statement-dialog').evaluate(el => el.open), false);
        await page.selectOption('#statement-type', 'outgoing');
        assert.equal(await page.locator('#statement-list button').count(), 8);
        await page.locator('#statement-list button').filter({ hasText: 'Loja Fictícia Alerta' }).dispatchEvent('click');
        assert.equal(await page.locator('#receipt-alert').evaluate(el => el.hidden), false);
        await click('#receipt-dispute');
        assert.match(await page.locator('#receipt-education').innerText(), /Nenhuma contestação foi aberta/);
        await page.evaluate(() => { navigator.clipboard.writeText = () => Promise.reject(new Error('Denied')); });
        await click('#receipt-copy');
        await page.waitForFunction(() => document.getElementById('receipt-feedback').textContent.includes('Não foi possível copiar'));
        await click('#receipt-alert [onclick="navigateFromReceipt(\'screening\')"]');
        assert.equal(await page.locator('#screen-screening').evaluate(el => el.classList.contains('hidden')), false);
        assert.equal(await page.locator('#statement-dialog').evaluate(el => el.open), false);
        await page.evaluate(() => { navigateTo('statement'); showTransactionDetails('DEMO-10'); });
        assert.match(await page.locator('#receipt-details').innerText(), /Em análise/);
        assert.equal(await page.locator('#receipt-alert').evaluate(el => el.hidden), true);
        await click('#receipt-dispute');
        await click('#receipt-education button');
        assert.equal(await page.locator('#screen-action-post').evaluate(el => el.classList.contains('hidden')), false);
        await page.evaluate(() => { navigateTo('statement'); showTransactionDetails('DEMO-03'); });
        await click('.receipt-close');
        assert.equal(await page.locator('#statement-dialog').evaluate(el => el.open), false);
        // Exercita o estado vazio sem mudar os dados de produção.
        await page.evaluate(() => {
            const original = statementScenario.transactions;
            statementScenario.transactions = [];
            renderTransactions();
            statementScenario.transactions = original;
        });
        assert.match(await page.locator('#statement-list').innerText(), /Nenhuma movimentação/);
        await click('#screen-statement [aria-label="Voltar ao início"]');
        assert.equal(await page.locator('#screen-home').evaluate(el => el.classList.contains('hidden')), false);
        assert.deepEqual(errors.filter(error => error !== 'tailwind is not defined'), []);
        console.log('PASS: saldo compartilhado; 12 IDs; totais; filtros 7/30/90 e tipos; detalhes; cópia real e falha; Escape/fechar; alertas; contestação educativa; navegação; estado vazio.');
        console.log('Erros externos observados:', JSON.stringify(errors));
        console.log('Limite: eventos DOM, sem validação visual ou de coordenadas; CDNs podem estar bloqueadas.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
