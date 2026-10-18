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
        const mobileParents = { statement: 'home', protection: 'screening', reviews: 'screening', security: 'screening' };
        await page.locator('#balance-toggle').click();
        for (const width of [360,390,768,1024,1366,1920]) {
            await page.setViewportSize({width,height:900});
            const desktop = width >= 1024;
            for (const screen of ['home','pix','statement','security','action-post','protection','reviews','rights']) {
                if (desktop) await page.locator(`#desktop-nav [data-nav-screen="${screen}"]`).click();
                else {
                    await page.locator('#nav-btn-home').click();
                    if (screen === 'statement') await page.locator('#screen-home .statement-link').click();
                    else if (['security','protection','reviews'].includes(screen)) await page.locator(`#home-services [onclick="navigateTo('${screen}')"]`).first().click();
                    else if (screen !== 'home') await page.locator(`#mobile-nav [data-nav-screen="${screen}"]`).click();
                }
                assert.equal(await page.locator('[id^="screen-"]:not(.hidden)').count(),1);
                assert.equal(await page.locator(`#screen-${screen}`).isVisible(),true);
                assert.equal(await page.locator('#desktop-nav [aria-current=page]').getAttribute('data-nav-screen'),screen);
                assert.equal(await page.locator('#mobile-nav [aria-current=page]').getAttribute('data-nav-screen'),mobileParents[screen]||screen);
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
                await last.scrollIntoViewIfNeeded();
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
        console.log('PASS responsive layout: 6 larguras, 8 telas por largura e 2 modais por largura, sem erros JavaScript.');
    } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
