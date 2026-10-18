const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
    const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
    try {
        const page = await browser.newPage();
        await require('./resources.cjs')(page);
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(process.env.JUSTEC_TEST_URL || 'http://127.0.0.1:8000/', { waitUntil: 'networkidle' });
        const snapshot = () => page.evaluate(() => ({ balance: bankState.balance, transactions: bankState.transactions.length, attempts: bankState.attempts.length }));
        const open = async (recipient, value) => {
            await page.evaluate(() => openPixFlow());
            await page.selectOption('#pix-recipient', recipient);
            await page.fill('#pix-amount', value);
            await page.locator('#pix-form button[type=submit]').click();
        };
        const analyze = async () => {
            await page.check('#pix-data-confirm');
            await page.locator('[onclick="analyzePix()"]').click();
            await page.waitForFunction(() => pixDraft && pixDraft.stage !== 'loading');
        };
        const auth = async () => {
            await page.locator('#pix-continue').click();
            await page.check('#pix-demo-confirm');
            await page.locator('#pix-submit').click();
        };
        assert.deepEqual(await snapshot(), { balance: 2480.5, transactions: 12, attempts: 0 });
        // Todos os formatos ilustrativos; nenhuma consulta a titularidade.
        assert.deepEqual(await page.evaluate(() => ['000.000.000-00', '00.000.000/0000-00', '+5511900000000', 'escola@example.invalid', '00000000-0000-0000-0000-000000000000'].map(isDemoKey)), [true, true, true, true, true]);
        await open('demo-low', '50,00');
        await page.locator('[onclick="analyzePix()"]').click();
        assert.match(await page.locator('#pix-feedback').innerText(), /Confirme explicitamente/);
        await analyze();
        assert.match(await page.locator('#pix-risk').innerText(), /Baixo risco/);
        await page.locator('#pix-continue').click();
        await page.locator('#pix-submit').click();
        assert.match(await page.locator('#pix-feedback').innerText(), /Confirme a operação/);
        await page.check('#pix-demo-confirm'); await page.locator('#pix-submit').click();
        assert.deepEqual(await snapshot(), { balance: 2430.5, transactions: 13, attempts: 0 });
        await page.evaluate(() => { completePix(); completePix(); });
        assert.equal((await snapshot()).transactions, 13);
        await page.locator('#pix-receipt').click();
        assert.match(await page.locator('#receipt-details').innerText(), /50,00/);
        assert.match(await page.locator('#statement-list').innerText(), /Pix enviado · simulação/);
        await page.locator('.receipt-close').click();
        const totals = await page.evaluate(() => calculateTotals(bankState.transactions));
        assert.equal(totals.outgoing, 1219.5);
        await open('demo-medium', '60,00'); await analyze();
        assert.match(await page.locator('#pix-risk').innerText(), /Risco moderado/);
        await page.locator('#pix-continue').click();
        assert.equal(await page.locator('#pix-auth').evaluate(el => el.hidden), true);
        await page.check('#pix-extra'); await auth();
        assert.deepEqual(await snapshot(), { balance: 2370.5, transactions: 14, attempts: 0 });
        await open('demo-high', '70,00'); await analyze();
        assert.match(await page.locator('#pix-result-text').innerText(), /sem desconto/);
        assert.deepEqual(await snapshot(), { balance: 2370.5, transactions: 14, attempts: 1 });
        await page.evaluate(() => { completePix(); analyzePix(); });
        assert.equal((await snapshot()).attempts, 1);
        await open('demo-high', '70,00'); await analyze();
        assert.equal((await snapshot()).attempts, 2);
        assert.equal(await page.evaluate(() => evaluateRisk(demoRecipients[2], 70).reasons.some(reason => reason.includes('Duas ou mais'))), true);
        for (const value of ['0', '-1', 'abc', '1,234', '1e3', '2.001,00']) {
            await open('demo-low', value);
            assert.equal(await page.locator('#pix-confirm').evaluate(el => el.hidden), true);
        }
        // Saldo insuficiente dentro do limite: o estado é alterado apenas no teste.
        await page.evaluate(() => { bankState.transactions.push({id:'TEST-DRAIN',amount:-2000,date:demoDate(),status:'completed',type:'payment',description:'Teste',participant:{name:'Teste',institution:'Teste'}}); });
        await open('demo-low', '500,00');
        assert.match(await page.locator('#pix-feedback').innerText(), /insuficiente/);
        await page.evaluate(() => bankState.transactions.pop());
        assert.equal((await snapshot()).balance, 2370.5);
        // Editar os dados invalida uma conferência antiga.
        await open('demo-low', '50,00');
        await page.fill('#pix-amount', '100,00');
        assert.equal(await page.locator('#pix-confirm').evaluate(el => el.hidden), true);
        // Revisão do falso positivo por botões reais e acompanhamento das etapas.
        await page.evaluate(() => navigateTo('reviews'));
        const falseCard = () => page.locator('#review-list article').filter({ hasText: 'Escola D' });
        await falseCard().getByRole('button', { name: 'Solicitar revisão simulada' }).click();
        assert.match(await page.locator('#review-feedback').innerText(), /10 a 500/);
        await falseCard().locator('textarea').fill('Cadastro fictício reconhecido, solicitar reavaliação educativa.');
        await falseCard().getByRole('button', { name: 'Solicitar revisão simulada' }).click();
        assert.match(await falseCard().innerText(), /Status: Revisão solicitada/);
        await falseCard().getByRole('button', { name: 'Simular início da análise' }).click();
        assert.match(await falseCard().innerText(), /Status: Em análise/);
        await falseCard().getByRole('button', { name: 'Exibir resultado demonstrativo' }).click();
        assert.match(await falseCard().innerText(), /Status: Restrição retirada/);
        await open('demo-false', '20,00'); await analyze(); await auth();
        assert.deepEqual(await snapshot(), { balance: 2350.5, transactions: 15, attempts: 2 });
        await page.evaluate(() => navigateTo('reviews'));
        const highCard = () => page.locator('#review-list article').filter({ hasText: 'Escola C' });
        await highCard().locator('textarea').fill('Revisão educativa no cenário de restrição mantida.');
        await highCard().getByRole('button', { name: 'Solicitar revisão simulada' }).click();
        await highCard().getByRole('button', { name: 'Simular início da análise' }).click();
        await highCard().getByRole('button', { name: 'Exibir resultado demonstrativo' }).click();
        assert.match(await highCard().innerText(), /Status: Restrição mantida/);
        // Chave digitada: validação e mascaramento, cenário alto cria nova restrição.
        await page.evaluate(() => openPixFlow()); await page.selectOption('#pix-recipient', 'custom');
        await page.fill('#pix-key','invalid'); await page.fill('#pix-amount','10,00');
        await page.locator('#pix-form button[type=submit]').click();
        assert.match(await page.locator('#pix-feedback').innerText(), /Formato de chave/);
        await page.fill('#pix-key','escola@example.invalid'); await page.selectOption('#pix-scenario','elevated');
        await page.locator('#pix-form button[type=submit]').click(); await analyze();
        assert.equal((await snapshot()).attempts,3);
        assert.equal(await page.evaluate(() => JSON.stringify(bankState).includes('escola@example.invalid')),false);
        await page.evaluate(() => navigateTo('security'));
        assert.match(await page.locator('#attempt-list').innerText(), /10,00/);
        const single = await page.evaluate(() => evaluateRisk({id:'isolated',flags:{internalAlert:true}},50));
        assert.equal(single.level, 'moderate');
        await page.reload({waitUntil:'networkidle'});
        assert.deepEqual(await snapshot(), { balance: 2480.5, transactions: 12, attempts: 0 });
        assert.deepEqual(errors.filter(error => error !== 'tailwind is not defined'), []);
        console.log('PASS: Pix baixo/moderado/elevado, confirmações obrigatórias, valores inválidos/limite/saldo, débito/extrato único, interrupções separadas, repetição, revisão solicitada/análise/retirada/manutenção, falso positivo liberado, chave customizada mascarada, reinício.');
        console.log('PAGE_ERRORS', JSON.stringify(errors));
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
