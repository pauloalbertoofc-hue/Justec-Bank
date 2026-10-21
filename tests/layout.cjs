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
        const mobileParents = { statement: 'home', protection: 'screening', reviews: 'screening', security: 'screening', 'edu-center': 'screening' };
        await page.locator('#balance-toggle').click();
        for (const width of [320,375,390,768,1024,1366,1920]) {
            await page.setViewportSize({width,height:900});
            const desktop = width >= 1024;
            for (const screen of ['home','pix','statement','security','action-post','protection','reviews','rights','screening','edu-center']) {
                if (desktop) await page.locator(`#desktop-nav [data-nav-screen="${screen}"]`).click();
                else {
                    await page.locator('#nav-btn-home').click();
                    if (screen === 'statement') await page.locator('#screen-home .statement-link').click();
                    else if (['security','protection','reviews'].includes(screen)) await page.locator(`#home-services [onclick="navigateTo('${screen}')"]`).first().click();
                    else if (screen === 'edu-center') {await page.locator('#header-security').click(); await page.locator('#screen-security [onclick="navigateTo(\'edu-center\')"]').click();}
                    else if (screen !== 'home') await page.locator(`#mobile-nav [data-nav-screen="${screen}"]`).click();
                }
                assert.equal(await page.locator('[id^="screen-"]:not(.hidden)').count(),1);
                assert.equal(await page.locator(`#screen-${screen}`).isVisible(),true);
                assert.equal(await page.locator('#desktop-nav [aria-current=page]').getAttribute('data-nav-screen'),screen);
                assert.equal(await page.locator('#mobile-nav [aria-current=page]').getAttribute('data-nav-screen'),mobileParents[screen]||screen);
                if (screen === 'home') {
                    const homeOrder = await page.locator('#screen-home > [id]').evaluateAll(nodes => nodes.map(node => node.id));
                    assert.deepEqual(homeOrder, ['home-security', 'home-balance', 'home-services']);
                    const securityBox = await page.locator('#home-security').boundingBox();
                    const balanceBox = await page.locator('#home-balance').boundingBox();
                    assert(securityBox.y + securityBox.height <= balanceBox.y, `${width} Rota da Segurança deve ficar acima do saldo`);
                    const columns = await page.locator('.demo-services').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
                    assert.equal(columns, width < 375 ? 2 : 3);
                }
                if (screen === 'pix') {
                    await page.locator('[data-pix-method="recipient"]').click();await page.locator('#pix-lookup').click();await page.locator('#pix-recipient-next').click();
                    await page.fill('#pix-amount', '0');
                    await page.locator('#pix-form button[type=submit]').click();
                    assert.match(await page.locator('#pix-feedback').innerText(), /valor positivo/);
                    const feedback = page.locator('#pix-feedback');
                    await feedback.evaluate(element => element.scrollIntoView({ block: 'center' }));
                    assert(await feedback.isVisible());
                    const messageBox = await feedback.boundingBox();
                    const headerBox = await page.locator('.app-header').boundingBox();
                    assert(messageBox.y >= headerBox.y + headerBox.height - 1 && messageBox.y + messageBox.height <= 900, `${width} message outside viewport`);
                    if (!desktop) {const navBox = await page.locator('#mobile-nav').boundingBox(); assert(messageBox.y + messageBox.height <= navBox.y + 1, `${width} message covered`);}
                }
                for (const field of await page.locator(`#screen-${screen} input:visible, #screen-${screen} select:visible, #screen-${screen} textarea:visible`).all()) {
                    await field.evaluate(element => element.scrollIntoView({ block: 'center' }));
                    const fieldBox = await field.boundingBox();
                    assert(fieldBox.x >= 0 && fieldBox.x + fieldBox.width <= width + 1, `${width}/${screen} field outside viewport`);
                    const header = await page.locator('.app-header').boundingBox();
                    assert(fieldBox.y >= header.y + header.height - 1, `${width}/${screen} field covered by header`);
                    if (!desktop) {const nav = await page.locator('#mobile-nav').boundingBox(); assert(fieldBox.y + fieldBox.height <= nav.y + 1, `${width}/${screen} field covered by navigation`);}
                }
                const measure = await page.evaluate(() => ({
                    overflow: document.documentElement.scrollWidth - innerWidth,
                    contentOverflow: getComputedStyle(document.getElementById('app-content')).overflowY,
                    contentWidth: document.getElementById('app-content').clientWidth,
                    shellWidth: document.querySelector('.app-shell').clientWidth
                }));
                assert(measure.overflow<=1,`${width}/${screen} horizontal ${measure.overflow}`);
                assert(!['scroll','auto'].includes(measure.contentOverflow),`${width}/${screen} double scrolling`);
                assert.equal(measure.shellWidth,width);
                if(desktop) assert(measure.contentWidth>width*.6);
                assert.equal(await page.locator('#mobile-nav').isVisible(),!desktop);
                assert.equal(await page.locator('#desktop-nav').isVisible(),desktop);
                const last = page.locator(`#screen-${screen} button:visible`).last();
                await last.evaluate(element => element.scrollIntoView({ block: 'end', inline: 'nearest' }));
                if (!desktop) {
                    const target = await last.boundingBox(); const nav = await page.locator('#mobile-nav').boundingBox();
                    assert(target.y+target.height<=nav.y+1,`${width}/${screen} last action covered by navigation`);
                }
            }
            await page.evaluate(() => {navigateTo('screening');showDiagnosis('bank_call')});
            const modal=await page.locator('#modal-box').boundingBox();
            assert(modal.x>=0 && modal.y>=0 && modal.x+modal.width<=width+1 && modal.y+modal.height<=900,`${width} alert outside viewport`);
            await page.locator('#modal-close-btn').click();
            await page.evaluate(() => {navigateTo('statement');showTransactionDetails('DEMO-01')});
            const receipt=await page.locator('#statement-dialog').boundingBox();
            assert(receipt.x>=0 && receipt.y>=0 && receipt.x+receipt.width<=width+1 && receipt.y+receipt.height<=900,`${width} receipt outside viewport`);
            await page.keyboard.press('Escape');
            await page.evaluate(()=>navigateTo('home'));
            assert.equal(await page.locator('#balance-display').innerText(),'R$ ••••••');
            await page.screenshot({path:`/tmp/justec-responsive-${width}.png`,fullPage:true});
            console.log(`PASS ${width}px: navegação, estado/aba ativa, rolagem única, últimos botões acessíveis, modais e ausência de overflow.`);
        }
        assert.deepEqual(errors,[]);
        console.log('PASS responsive layout: 7 larguras, 10 telas por largura e 2 modais por largura, sem erros JavaScript.');
    } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
