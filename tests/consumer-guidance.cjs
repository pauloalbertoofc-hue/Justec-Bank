const {chromium} = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox']});
 try {
  const page = await browser.newPage(); await require('./resources.cjs')(page);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(process.env.JUSTEC_TEST_URL || 'http://127.0.0.1:8000/', {waitUntil:'networkidle'});
  const screen = page.locator('#screen-action-post');
  const snapshot = () => page.evaluate(() => JSON.stringify(bankState));
  const before = await snapshot();
  const expected = [
   'https://www.procon.sp.gov.br/', 'https://www.bcb.gov.br/', 'https://www.consumidor.gov.br/',
   'https://www.delegaciaeletronica.policiacivil.sp.gov.br/ssp-de-cidadao/home', 'https://www.defensoria.sp.def.br/'
  ];
  let externalClicks = 0;
  // Test destination and browser opening without claiming that blocked official sites respond.
  await page.context().route(url => expected.includes(url.href), async route => {
   externalClicks++; await route.fulfill({status:200,contentType:'text/html',body:'<title>Test destination</title>'});
  });
  for (const width of [320,375,390,768,1024,1366,1920]) {
   await page.setViewportSize({width,height:900});
   await page.locator(width>=1024 ? '#desktop-nav [data-nav-screen="action-post"]' : '#mobile-nav [data-nav-screen="action-post"]').click();
   assert(await screen.isVisible());
   assert.equal(await screen.locator('h2').innerText(), 'Orientação e Defesa do Consumidor');
   const about = page.locator('#guard-about');
   assert.equal(await about.evaluate(el=>el.open), false);
   assert.equal(await page.locator('#guard-operation-guide').isVisible(), false);
   assert.equal(await screen.locator('input,textarea,select').count(), 0);
   assert.equal(await page.locator('#consumer-channels article').count(),6);
   assert.match(await screen.innerText(), /MED não garante a recuperação/);
   assert.match(await screen.innerText(), /Validação pendente/);
   assert.equal(await screen.locator('a[href^="tel:"]').count(),0);
   for (const article of await screen.locator('article.guidance-card').all()) {
    assert(await article.getAttribute('aria-labelledby'));
    const title = await article.getAttribute('aria-labelledby');
    assert(await article.locator(`[id="${title}"]`).innerText());
    assert(await article.locator('a,button').count());
   }
   // Native disclosure supports keyboard use and reveals supplementary information.
   for (const details of await screen.locator('details').all()) {
    const summary = details.locator(':scope > summary');
    await summary.focus(); await page.keyboard.press('Enter');
    assert(await details.evaluate(el=>el.open));
    assert(await summary.evaluate(el=>document.activeElement===el));
    const box=await details.boundingBox(); assert(box.x>=0 && box.x+box.width<=width+1);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    await page.keyboard.press('Enter'); assert.equal(await details.evaluate(el=>el.open),false);
   }
   for (const link of await screen.locator('a[href^="#"]').all()) {
    const href=await link.getAttribute('href'); assert.equal(await page.locator(href).count(),1);
    await link.click(); assert.equal(await page.evaluate(()=>location.hash),href);
    const target=await page.locator(href).boundingBox();
    const header=await page.locator('.app-header').boundingBox();
    assert(target.y>=header.y+header.height-1,`${width}: anchor hidden behind header`);
    assert(target.y<900,`${width}: anchor unreachable`);
   }
   for (const control of await screen.locator('button:visible,a:visible,summary:visible').all()) {
    await control.evaluate(el=>el.scrollIntoView({block:'center'}));
    const box=await control.boundingBox(); const header=await page.locator('.app-header').boundingBox();
    assert(box.x>=0 && box.x+box.width<=width+1,`${width}: control overflows horizontally`);
    assert(box.y>=header.y+header.height-1,`${width}: control covered by header`);
    if(width<1024) {const nav=await page.locator('#mobile-nav').boundingBox(); assert(box.y+box.height<=nav.y+1,`${width}: control covered by navigation`);}
    assert(await control.evaluate(el=>{const r=el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),`${width}: control obstructed`);
   }
   const actual=await screen.locator('a[target="_blank"]').evaluateAll(nodes=>nodes.map(el=>el.href));
   assert.deepEqual(actual,expected);
   for (const link of await screen.locator('a[target="_blank"]').all()) {
    assert.match(await link.innerText(),/externo, nova aba/);
    assert.match(await link.getAttribute('rel'),/noopener/);
    assert.match(await link.getAttribute('rel'),/noreferrer/);
    const popupPromise=page.waitForEvent('popup'); await link.click(); const popup=await popupPromise;
    await popup.waitForLoadState('domcontentloaded'); assert.equal(popup.url(),await link.getAttribute('href')); await popup.close();
   }
   await screen.locator('[onclick="navigateTo(\'screening\')"]').click(); assert(await page.locator('#screen-screening').isVisible());
   await page.evaluate(()=>navigateTo('action-post'));
   await screen.locator('[onclick="openMedWizard()"]').click(); assert(await page.locator('#app-modal').isVisible());
   await page.locator('#modal-close-btn').click();
   await screen.getByRole('button',{name:'Voltar ao início',exact:true}).click(); assert(await page.locator('#screen-home').isVisible());
   assert.equal(await snapshot(),before);
   console.log(`PASS orientação ${width}px: cartões, teclado, detalhes, links internos/externos simulados, retorno, roteiro e estado preservado.`);
  }
  assert.equal(externalClicks,35); assert.deepEqual(errors,[]);
  await page.setViewportSize({width:390,height:900}); await page.evaluate(()=>navigateTo('action-post'));
  await page.screenshot({path:'/tmp/justec-consumer-guidance-390.png',fullPage:true});
  console.log('PASS central de orientação: 7 larguras, 35 aberturas externas interceptadas. Disponibilidade real dos portais NÃO verificada.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
