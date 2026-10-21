const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:900}});await require('./resources.cjs')(page);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.JUSTEC_TEST_URL||'http://127.0.0.1:8000/',{waitUntil:'networkidle'});
  const flow=require('./pix-helpers.cjs')(page);const state=()=>page.evaluate(()=>JSON.stringify(bankState));const initial=await state();
  const stage=()=>page.evaluate(()=>pixJourney.stage);
  // Real default interval, no fast-forward: attempts through public handlers are rejected.
  assert.equal(await page.evaluate(()=>pixConfig.reflectionMs),5000);
  await flow.open();await flow.analyze();assert.equal(await page.evaluate(()=>pixDraft.evidence.indicators.find(i=>i.code==='NEW_RECIPIENT').value),true);assert.equal(await stage(),'pause');assert.equal(await page.locator('#pix-continue').isDisabled(),true);
  await page.evaluate(()=>{showDemoAuthentication();completePix();});assert.equal(await stage(),'pause');
  await page.waitForFunction(()=>!document.getElementById('pix-continue').disabled);assert.equal(await stage(),'pause');assert.equal(await page.locator('#pix-auth').isVisible(),false);
  assert.equal(await state(),initial.replace('"sequence":2','"sequence":3')); // Draft ID, never a debit.
  await page.locator('[onclick="reconsiderPix()"]:visible').click();assert.equal(await stage(),'confirmation');assert.equal(await page.locator('#pix-continue').isDisabled(),true);
  await page.locator('[onclick="reconsiderPix(\'triage\')"]').click();assert(await page.locator('#screen-screening').isVisible());assert(await page.locator('#pix-resume').isVisible());
  await page.locator('#pix-resume').click();assert.equal(await stage(),'confirmation');assert.equal(await page.locator('#pix-data-confirm').isChecked(),false);
  await page.evaluate(()=>pixConfig.reflectionMs=40);await flow.analyze();await flow.pause();await page.locator('#pix-continue').click();
  const beforeWrong=await state();await page.fill('#pix-demo-code','1234');await page.check('#pix-demo-confirm');await page.locator('#pix-submit').click();assert.match(await page.locator('#pix-feedback').innerText(),/Código demonstrativo incorreto/);assert.equal(await state(),beforeWrong);assert.equal(await page.inputValue('#pix-demo-code'),'');
  // Programmatic edit without DOM input event: final consistency check must still reject.
  await page.evaluate(()=>document.getElementById('pix-amount').value='75,00');await page.fill('#pix-demo-code','0000');await page.check('#pix-demo-confirm');await page.locator('#pix-submit').click();assert.match(await page.locator('#pix-feedback').innerText(),/valor mudou/);assert.equal(await state(),beforeWrong);
  await flow.open();await flow.analyze();await flow.pause();await page.locator('#pix-continue').click();
  const beforeFailure=await state();await page.evaluate(()=>{globalThis.savedRecord=recordApprovedPix;recordApprovedPix=()=>{throw new Error('Falha de registro simulada');};});
  await page.fill('#pix-demo-code','0000');await page.check('#pix-demo-confirm');await page.locator('#pix-submit').click();assert.match(await page.locator('#pix-feedback').innerText(),/Falha de registro/);assert.equal(await state(),beforeFailure);assert.equal(await page.locator('#pix-result').isVisible(),false);await page.evaluate(()=>recordApprovedPix=globalThis.savedRecord);
  await page.fill('#pix-demo-code','0000');await page.check('#pix-demo-confirm');await page.evaluate(()=>{completePix();completePix();});assert.equal(await stage(),'completed');assert.equal(await page.evaluate(()=>bankState.transactions.length),13);
  // New recipient alone is allowed; unavailable data not invented.
  await flow.open('demo-low','10,00');await flow.analyze();assert.equal(await page.evaluate(()=>pixDraft.policy.action),'ALLOWED');assert.equal(await page.evaluate(()=>pixDraft.evidence.indicators.find(i=>i.code==='SESSION_SIGNAL').available),false);
  await page.locator('[onclick="reconsiderPix()"]:visible').click();await page.locator('[onclick="reconsiderPix(\'review\')"]:visible').click();
  await page.locator('[onclick="editPixDetails()"]').click();await page.check('#pix-context-request');await page.locator('#pix-form button[type=submit]').click();await flow.analyze();assert.equal(await stage(),'verification');
  await flow.answers({urgency:'yes'});assert.equal(await page.evaluate(()=>pixDraft.policy.action),'NEEDS_VERIFICATION');await page.check('#pix-extra');await page.locator('#pix-start-pause').click();assert.match(await page.locator('#pix-tip').innerText(),/Pressa/);
  const baseline=await page.evaluate(()=>({balance:bankState.balance,count:bankState.transactions.length,restrictions:bankState.restrictions.length}));
  // Context uncertainty prevents authorization; combined reports block only this attempt.
  await flow.open();await page.locator('[onclick="editPixDetails()"]').click();await page.check('#pix-context-request');await page.locator('#pix-form button[type=submit]').click();await flow.analyze();
  await page.locator('#pix-check-context').click();assert.equal(await page.evaluate(()=>pixDraft.policy.action),'INCONCLUSIVE');assert.equal(await page.locator('#pix-start-pause').isVisible(),false);
  await flow.answers({identity:'no'});assert.equal(await page.evaluate(()=>pixDraft.policy.action),'NEEDS_VERIFICATION');
  await flow.answers({identity:'no',advance:'yes',urgency:'yes'});assert.equal(await stage(),'interrupted');
  assert.deepEqual(await page.evaluate(()=>({balance:bankState.balance,count:bankState.transactions.length,restrictions:bankState.restrictions.length})),baseline);assert.equal(await page.locator('#pix-receipt').isVisible(),false);
  // A forged screen/draft stage cannot skip the independent journey state.
  await flow.open();const beforeForged=await state();await page.evaluate(()=>{pixDraft.stage='authentication';completePix();});assert.equal(await state(),beforeForged);assert.equal(await stage(),'confirmation');
  // A changed recipient or balance at the final step invalidates authorization.
  await flow.analyze();await flow.pause();await page.locator('#pix-continue').click();
  const beforeRecipient=await state();await page.evaluate(()=>document.getElementById('pix-recipient').value='demo-medium');
  await page.fill('#pix-demo-code','0000');await page.check('#pix-demo-confirm');await page.locator('#pix-submit').click();assert.match(await page.locator('#pix-feedback').innerText(),/Destinatário alterado/);assert.equal(await state(),beforeRecipient);
  await flow.open();await flow.analyze();await flow.pause();await page.locator('#pix-continue').click();
  await page.evaluate(()=>bankState.transactions.push({id:'DRAIN',amount:-bankState.balance,date:demoDate(),type:'payment',status:'completed',description:'Teste',participant:{name:'Teste',institution:'Teste'}}));
  const beforeDrain=await state();await page.fill('#pix-demo-code','0000');await page.check('#pix-demo-confirm');await page.locator('#pix-submit').click();assert.match(await page.locator('#pix-feedback').innerText(),/insuficiente/);assert.equal(await state(),beforeDrain);await page.evaluate(()=>bankState.transactions.pop());
  // Final restriction and insufficient balance are re-read, never cached approval.
  await flow.open();await flow.analyze();await flow.pause();await page.locator('#pix-continue').click();const beforeRestriction=await page.evaluate(()=>bankState.balance);
  await page.evaluate(()=>bankState.restrictions.push({id:'TEST',recipientId:'demo-low',status:'Restrição ativa',reasons:['Teste'],history:[],reason:''}));
  await page.fill('#pix-demo-code','0000');await page.check('#pix-demo-confirm');await page.locator('#pix-submit').click();assert.equal(await stage(),'interrupted');assert.equal(await page.evaluate(()=>bankState.balance),beforeRestriction);
  await page.reload({waitUntil:'networkidle'});assert.equal(await state(),initial);
  // Full journey at every breakpoint, keyboard focus, no covered form or horizontal scroll.
  await page.evaluate(()=>pixConfig.reflectionMs=40);
  for(const width of [320,375,390,768,1024,1366,1920]) {
   await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'reduce'});
   await flow.open('demo-medium','1,00');await flow.analyze();
   for(const field of await page.locator('#pix-triage select').all()) {
    await field.focus();await field.evaluate(el=>el.scrollIntoView({block:'center'}));const box=await field.boundingBox();assert(box.x>=0&&box.x+box.width<=width+1);
    const header=await page.locator('.app-header').boundingBox();assert(box.y>=header.y+header.height-1);
    if(width<1024){const nav=await page.locator('#mobile-nav').boundingBox();assert(box.y+box.height<=nav.y+1);}
   }
   await flow.answers();await page.check('#pix-extra');await page.locator('#pix-start-pause').click();assert.equal(await page.locator('#pix-pause-title').evaluate(el=>document.activeElement===el),true);
   for(const element of await page.locator('#pix-pause button:visible').all()) {
    await element.evaluate(el=>el.scrollIntoView({block:'center'}));const box=await element.boundingBox();const header=await page.locator('.app-header').boundingBox();assert(box.x>=0&&box.x+box.width<=width+1&&box.height>=44);assert(box.y>=header.y+header.height-1);
    if(width<1024){const nav=await page.locator('#mobile-nav').boundingBox();assert(box.y+box.height<=nav.y+1);}
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   await page.locator('#pix-pause').evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:`/tmp/justec-pix-pause-${width}.png`});await flow.auth();assert.equal(await stage(),'completed');
   console.log(`PASS Pix 2.0 ${width}px: pausa, controles acessíveis, movimento reduzido, autorização e registro único.`);
  }
  // Abandon and edit after authentication revoke prior authority.
  await flow.open();await flow.analyze();await flow.pause();await page.locator('#pix-continue').click();const beforeLeave=await page.evaluate(()=>bankState.balance);
  await page.locator('.app-header a').click();
  await page.evaluate(()=>{completePix();resumePix();});assert.equal(await stage(),'confirmation');assert.equal(await page.evaluate(()=>bankState.balance),beforeLeave);assert.equal(await page.inputValue('#pix-demo-code'),'');
  await page.locator('[onclick="editPixDetails()"]').click();await page.fill('#pix-amount','2,00');assert.equal(await page.evaluate(()=>pixDraft),null);assert.equal(await page.locator('#pix-auth').isVisible(),false);
  await flow.open();await flow.analyze();assert.equal(await stage(),'pause');await page.reload({waitUntil:'networkidle'});assert.equal(await state(),initial);assert.equal(await page.evaluate(()=>pixDraft),null);assert.equal(await page.locator('#pix-auth').isVisible(),false);assert.deepEqual(errors,[]);
  console.log('PASS Pix 2.0: pausa real 5s sem avanço, acesso prematuro, reconsideração/retomada, código incorreto, edição, falha de registro, duplo envio, evidência contextual, inconclusivo, restrição final, abandono e recarga.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
