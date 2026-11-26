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
        const mobileParents = { informa: 'home', 'cards-preview': 'home', statement: 'home', protection: 'screening', reviews: 'screening', security: 'screening', 'edu-center': 'screening' };
        await page.locator('#balance-toggle').click();
        for (const width of [320,375,390,768,1024,1366,1920]) {
            await page.setViewportSize({width,height:900});
            const desktop = false; // Preview uses the same bottom navigation at every width.
            for (const screen of ['home','pix','statement','security','action-post','protection','reviews','rights','screening','edu-center','cards-preview','informa']) {
                if (desktop) await page.locator(`#desktop-nav [data-nav-screen="${screen}"]`).click();
                else {
                    await page.locator('#nav-btn-home').click();
                    if (screen === 'statement') await page.locator('#screen-home .statement-link').click();
                    else if (['security','protection','reviews','cards-preview','informa'].includes(screen)) await page.locator(`#home-services [onclick="navigateTo('${screen}')"]`).first().click();
                    else if (screen === 'edu-center') {await page.locator('#header-security').click(); await page.locator('#screen-security [onclick="navigateTo(\'edu-center\')"]').click();}
                    else if (screen !== 'home') await page.locator(`#mobile-nav [data-nav-screen="${screen}"]`).click();
                }
                assert.equal(await page.locator('[id^="screen-"]:not(.hidden)').count(),1);
                assert.equal(await page.locator(`#screen-${screen}`).isVisible(),true);
                if(!['cards-preview','informa'].includes(screen)) assert.equal(await page.locator('#desktop-nav [aria-current=page]').getAttribute('data-nav-screen'),screen);
                assert.equal(await page.locator('#mobile-nav [aria-current=page]').getAttribute('data-nav-screen'),mobileParents[screen]||screen);
                if ([390,1366].includes(width)) {
                    await page.screenshot({path:`/tmp/justec-responsive-${width}-${screen}.png`,fullPage:true,animations:'disabled'});
                }
                if (screen === 'home') {
                    const homeOrder = await page.locator('#screen-home > [id]').evaluateAll(nodes => nodes.map(node => node.id));
                    assert.deepEqual(homeOrder, ['home-security', 'home-balance', 'home-services', 'home-informa', 'home-recent']);
                    const securityBox = await page.locator('#home-security').boundingBox();
                    const balanceBox = await page.locator('#home-balance').boundingBox();
                    assert(securityBox.y + securityBox.height <= balanceBox.y, `${width} Rota da Segurança deve ficar acima do saldo`);
                    const services=page.locator('#home-services .demo-services');
                    assert.equal(await services.locator('button').count(),8);
                    assert.equal(await services.evaluate(el=>getComputedStyle(el).flexWrap),'nowrap');
                    assert.equal(await services.evaluate(el=>getComputedStyle(el).overflowX),'auto');
                    if(width<=390){
                        assert.ok(await services.evaluate(el=>el.scrollWidth>el.clientWidth));
                        await services.evaluate(el=>el.scrollLeft=el.scrollWidth);
                        assert.ok(await services.evaluate(el=>el.scrollLeft>0));
                        await services.evaluate(el=>el.scrollLeft=0);
                    }
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
                assert(Math.abs(measure.shellWidth - (width >= 680 ? 678 : width >= 640 ? width-2 : width)) <= 1);
                if(desktop) assert(measure.contentWidth>width*.6);
                assert.equal(await page.locator('#mobile-nav').isVisible(),!desktop);
                assert.equal(await page.locator('#desktop-nav').isVisible(),desktop);
                const last = page.locator(`#screen-${screen} button:visible`).last();
                await last.evaluate(element => element.scrollIntoView({ block: 'end', inline: 'nearest', behavior: 'instant' }));
                await page.waitForFunction(() => !document.querySelector('[id^="screen-"]:not(.hidden)')?.getAnimations().some(a => a.playState === 'running'));
                await last.evaluate(element => element.scrollIntoView({ block: 'end', inline: 'nearest', behavior: 'instant' }));
                if (!desktop) {
                    const target = await last.boundingBox(); const nav = await page.locator('#mobile-nav').boundingBox();
                    assert(target.y+target.height<=nav.y+1,`${width}/${screen} last action covered by navigation: target=${JSON.stringify(target)} nav=${JSON.stringify(nav)}`);
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
        await page.evaluate(()=>navigateTo('cards-preview'));
        await page.fill('#preview-card-limit','1000');
        await page.click('#preview-limit-save');
        await page.fill('#preview-merchant','Loja fictícia');
        await page.fill('#preview-purchase-amount','150');
        await page.click('#preview-purchase-form button[type=submit]');
        assert.match(await page.locator('#preview-invoice').innerText(),/150,00/);
        assert.match(await page.locator('#preview-limit-status').innerText(),/850,00/);
        await page.click('#preview-card-toggle');
        await page.fill('#preview-merchant','Compra recusada');
        await page.fill('#preview-purchase-amount','10');
        await page.click('#preview-purchase-form button[type=submit]');
        assert.match(await page.locator('#preview-purchase-status').innerText(),/bloqueado/);
        await page.reload({waitUntil:'networkidle'});
        await page.evaluate(()=>navigateTo('cards-preview'));
        assert.equal(await page.locator('#preview-card-toggle').getAttribute('aria-pressed'),'true');
        assert.match(await page.locator('#preview-invoice').innerText(),/150,00/);
        assert.equal(await page.locator('#preview-purchases li').count(),1);
        const beforePayment = await page.evaluate(()=>bankState.balance);
        await page.getByRole('button',{name:'Pagar fatura integral',exact:true}).click();
        assert.match(await page.locator('#preview-invoice').innerText(),/0,00/);
        assert.match(await page.locator('#preview-limit-status').innerText(),/1\.000,00/);
        assert.equal(await page.evaluate(()=>bankState.balance),Math.round((beforePayment-150)*100)/100);
        await page.getByRole('button',{name:'Pagar fatura integral',exact:true}).click();
        assert.equal(await page.evaluate(()=>bankState.transactions.filter(t=>t.id.startsWith('CARD-PAY-')).length),1);
        await page.reload({waitUntil:'networkidle'});
        assert.equal(await page.evaluate(()=>bankState.balance),Math.round((beforePayment-150)*100)/100);
        assert.equal(await page.evaluate(()=>bankState.transactions.filter(t=>t.id.startsWith('CARD-PAY-')).length),1);
        await page.evaluate(()=>navigateTo('cards-preview'));
        await page.locator('#preview-paid-invoices summary').first().click();
        await page.getByRole('button',{name:'Contestar parcela paga',exact:true}).click();
        await page.locator('#preview-purchase-claims').getByRole('button',{name:'Simular rejeição',exact:true}).click();
        assert.equal(await page.evaluate(()=>bankState.balance),Math.round((beforePayment-150)*100)/100);
        assert.equal(await page.evaluate(()=>bankState.transactions.filter(t=>t.id.startsWith('CARD-REFUND-')).length),0);
        await page.evaluate(()=>navigateTo('cards-preview'));
        await page.locator('#preview-paid-invoices summary').first().click();
        await page.getByRole('button',{name:'Contestar parcela paga',exact:true}).click();
        await page.locator('#preview-purchase-claims').getByRole('button',{name:'Simular aprovação',exact:true}).click();
        assert.equal(await page.evaluate(()=>bankState.balance),beforePayment);
        await page.reload({waitUntil:'networkidle'});
        assert.equal(await page.evaluate(()=>bankState.balance),beforePayment);
        assert.equal(await page.evaluate(()=>bankState.transactions.filter(t=>t.id.startsWith('CARD-REFUND-')).length),1);
        await page.evaluate(()=>navigateTo('cards-preview'));
        await page.locator('#preview-paid-invoices summary').first().click();
        await page.getByRole('button',{name:'Contestar parcela paga',exact:true}).click();
        assert.equal(await page.locator('#preview-purchase-claims').getByRole('button',{name:'Simular aprovação',exact:true}).count(),0);
        assert.equal(await page.evaluate(()=>bankState.balance),beforePayment);
        await page.evaluate(()=>recordApprovedPix({id:'TEST-PERSIST-PIX',amount:25,recipient:{id:'test-recipient',name:'Destinatário fictício'}}));
        const expected=Math.round((beforePayment-25)*100)/100;
        assert.equal(await page.evaluate(()=>bankState.balance),expected);
        await page.reload({waitUntil:'networkidle'});
        assert.equal(await page.evaluate(()=>bankState.balance),expected);
        assert.equal(await page.evaluate(()=>bankState.transactions.filter(t=>t.id==='TEST-PERSIST-PIX').length),1);
        await page.evaluate(()=>navigateTo('security'));
        page.once('dialog',dialog=>dialog.dismiss());
        await page.getByRole('button',{name:'Reiniciar demonstração',exact:true}).click();
        assert.equal(await page.evaluate(()=>bankState.balance),expected);
        page.once('dialog',dialog=>dialog.accept());
        await Promise.all([page.waitForNavigation({waitUntil:'networkidle'}),page.getByRole('button',{name:'Reiniciar demonstração',exact:true}).click()]);
        assert.equal(await page.evaluate(()=>bankState.balance),beforePayment);
        assert.equal(await page.evaluate(()=>bankState.transactions.filter(t=>t.id==='TEST-PERSIST-PIX'||t.id.startsWith('CARD-PAY-')||t.id.startsWith('CARD-REFUND-')).length),0);
        await page.evaluate(()=>navigateTo('cards-preview'));
        assert.match(await page.locator('#preview-invoice').innerText(),/0,00/);
        assert.equal(await page.locator('#preview-card-toggle').getAttribute('aria-pressed'),'false');
        await page.evaluate(()=>{
            recordInterruptedPix({id:'TEST-INTERRUPTED',amount:50,recipient:{id:demoRecipients[0].id,falsePositive:true}},{reasons:['Cenário educativo']});
            const restriction=bankState.restrictions.at(-1);
            requestReview(restriction.id,'Justificativa fictícia de teste');
            advanceReview(restriction.id);
            advanceReview(restriction.id);
        });
        const securitySnapshot=await page.evaluate(()=>JSON.stringify({attempts:bankState.attempts,restrictions:bankState.restrictions}));
        await page.reload({waitUntil:'networkidle'});
        assert.equal(await page.evaluate(()=>JSON.stringify({attempts:bankState.attempts,restrictions:bankState.restrictions})),securitySnapshot);
        assert.equal(await page.evaluate(()=>bankState.restrictions.at(-1).status),'Restrição retirada');
        assert.equal(await page.evaluate(()=>bankState.balance),beforePayment);
        await page.evaluate(()=>navigateTo('cards-preview'));
        await page.fill('#preview-merchant','Compra parcial fictícia');
        await page.fill('#preview-purchase-amount','300');
        await page.click('#preview-purchase-form button[type=submit]');
        await page.getByLabel('Valor do pagamento parcial em reais').fill('120');
        await page.getByRole('button',{name:'Pagar valor parcial',exact:true}).click();
        assert.match(await page.locator('#preview-invoice').innerText(),/180,00/);
        assert.equal(await page.evaluate(()=>bankState.balance),Math.round((beforePayment-120)*100)/100);
        await page.getByRole('button',{name:'Contestar compra integralmente',exact:true}).click();
        await page.evaluate(()=>navigateTo('cards-preview'));
        await page.locator('#preview-paid-invoices summary').first().click();
        await page.getByRole('button',{name:'Contestar parcela paga',exact:true}).click();
        assert.equal(await page.locator('#preview-purchase-claims').getByRole('button',{name:'Simular aprovação',exact:true}).count(),1);
        assert.equal(await page.evaluate(()=>previewCardState.claims.filter(c=>c.status==='pending'&&c.full===true).length),1);
        await page.locator('#preview-purchase-claims').getByRole('button',{name:'Simular rejeição',exact:true}).click();
        assert.equal(await page.evaluate(()=>bankState.balance),Math.round((beforePayment-120)*100)/100);
        await page.evaluate(()=>navigateTo('cards-preview'));
        await page.getByRole('button',{name:'Contestar compra integralmente',exact:true}).click();
        await page.locator('#preview-purchase-claims').getByRole('button',{name:'Simular aprovação',exact:true}).click();
        assert.equal(await page.evaluate(()=>bankState.balance),beforePayment);
        await page.reload({waitUntil:'networkidle'});
        await page.evaluate(()=>navigateTo('cards-preview'));
        assert.match(await page.locator('#preview-invoice').innerText(),/0,00/);
        assert.match(await page.locator('#preview-limit-status').innerText(),/1\.000,00/);
        assert.equal(await page.evaluate(()=>bankState.balance),beforePayment);
        assert.equal(await page.evaluate(()=>bankState.transactions.filter(t=>t.id.startsWith('CARD-REFUND-')).length),1);
        await page.locator('#preview-paid-invoices summary').first().click();
        await page.getByRole('button',{name:'Contestar parcela paga',exact:true}).click();
        assert.equal(await page.locator('#preview-purchase-claims').getByRole('button',{name:'Simular aprovação',exact:true}).count(),0);
        const medBalance = await page.evaluate(()=>bankState.balance);
        await page.evaluate(()=>{navigateTo('statement');showTransactionDetails('DEMO-02');});
        await page.click('#receipt-dispute');
        await page.click('#receipt-med');
        await page.selectOption('#med-reason','outro');
        await page.click('#med-form button[type=submit]');
        assert.match(await page.locator('#med-feedback').innerText(),/não é hipótese/);
        await page.selectOption('#med-reason','fraude');
        await page.click('#med-form button[type=submit]');
        assert.match(await page.locator('#med-list').innerText(),/Em análise/);
        await page.getByRole('button',{name:'Simular devolução parcial',exact:true}).click();
        assert.match(await page.locator('#med-list').innerText(),/75,00/);
        await page.reload({waitUntil:'networkidle'});
        await page.evaluate(()=>navigateTo('reviews'));
        assert.match(await page.locator('#med-list').innerText(),/Devolução parcial/);
        assert.equal(await page.evaluate(()=>bankState.balance),Math.round((medBalance+75)*100)/100);
        assert.equal(await page.evaluate(()=>bankState.transactions.filter(t=>t.id==='MED-REFUND-DEMO-02').length),1);
        await page.evaluate(()=>reconcileMedCredits());
        assert.equal(await page.evaluate(()=>bankState.transactions.filter(t=>t.id==='MED-REFUND-DEMO-02').length),1);
        await page.evaluate(()=>{navigateTo('statement');showTransactionDetails('DEMO-02');});
        await page.click('#receipt-dispute');
        await page.click('#receipt-med');
        await page.selectOption('#med-reason','fraude');
        await page.click('#med-form button[type=submit]');
        assert.match(await page.locator('#med-feedback').innerText(),/Já existe/);
        for (const [id,outcome,credit] of [['DEMO-06','Simular devolução integral',250],['DEMO-10','Simular negativa',0]]) {
            const prior = await page.evaluate(()=>bankState.balance);
            await page.evaluate(id=>{navigateTo('statement');showTransactionDetails(id);},id);
            await page.click('#receipt-dispute');
            await page.click('#receipt-med');
            await page.selectOption('#med-reason','fraude');
            await page.click('#med-form button[type=submit]');
            await page.getByRole('button',{name:outcome,exact:true}).click();
            assert.equal(await page.evaluate(()=>bankState.balance),Math.round((prior+credit)*100)/100);
            assert.equal(await page.evaluate(id=>bankState.transactions.filter(t=>t.id==='MED-REFUND-'+id).length,id),credit?1:0);
        }
        await page.evaluate(()=>{navigateTo('statement');showTransactionDetails('DEMO-03');});
        await page.click('#receipt-dispute');
        assert.equal(await page.locator('#receipt-med').isVisible(),false);
        await page.evaluate(()=>closeTransactionDetails());
        await page.emulateMedia({reducedMotion:'no-preference'});
        await page.evaluate(()=>navigateTo('statement'));
        assert.equal(await page.locator('#screen-statement').evaluate(el=>getComputedStyle(el).animationName),'justec-screen-enter');
        await page.emulateMedia({reducedMotion:'reduce'});
        await page.evaluate(()=>navigateTo('home'));
        assert.equal(await page.locator('#screen-home').evaluate(el=>getComputedStyle(el).animationName),'none');
        assert.equal(await page.locator('[id^="screen-"]:not(.hidden)').count(),1);
        assert.deepEqual(errors,[]);
        console.log('PASS responsive layout: 7 larguras, 12 telas por largura e 2 modais por largura, sem erros JavaScript.');
    } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
