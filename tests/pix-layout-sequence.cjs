const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage();await require('./resources.cjs')(page);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.JUSTEC_TEST_URL||'http://127.0.0.1:8000/',{waitUntil:'networkidle'});await page.evaluate(()=>pixConfig.reflectionMs=40);
  async function step(number,panel,width){
   assert.equal(await page.locator('#pix-stepper [aria-current=step]').getAttribute('data-pix-step'),String(number));
   const panels=['pix-start-step','pix-recipient-step','pix-value','pix-confirm','pix-guard','pix-pause','pix-auth','pix-result'];
   for(const id of panels)assert.equal(await page.locator('#'+id).isVisible(),id===panel,`Etapa ${number}: ${id}`);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   for(const control of await page.locator(`#${panel} button:visible, #${panel} input:visible, #${panel} select:visible`).all()){
    await control.evaluate(el=>el.scrollIntoView({block:'center'}));const box=await control.boundingBox();assert(box.x>=0&&box.x+box.width<=width+1);
    const header=await page.locator('.app-header').boundingBox();assert(box.y>=header.y+header.height-1);
    if(width<1024){const nav=await page.locator('#mobile-nav').boundingBox();assert(box.y+box.height<=nav.y+1);}
   }
   await page.locator('#'+panel).evaluate(el=>el.scrollIntoView({block:'start'}));
   if(width===390)await page.screenshot({path:`/tmp/justec-pix-layout-${number}.png`});
  }
  for(const width of [320,375,390,768,1024,1366,1920]){
   await page.setViewportSize({width,height:900});await page.evaluate(()=>openPixFlow());await step(1,'pix-start-step',width);
   assert.equal(await page.locator('#pix-start-step button:disabled').count(),2);
   await page.locator('[data-pix-method="key"]').click();await step(2,'pix-recipient-step',width);
   await page.locator('#pix-key').pressSequentially('escola-a@example.invalid');assert.equal(await page.inputValue('#pix-key'),'escola-a@example.invalid');await page.locator('#pix-lookup').click();assert.match(await page.locator('#pix-recipient-info').innerText(),/Escola A/);
   assert.equal(await page.locator('#pix-value').isVisible(),false);await page.locator('#pix-recipient-next').click();await step(3,'pix-value',width);
   await page.locator('#pix-amount-pad').getByRole('button',{name:'Dígito 5',exact:true}).click();await page.locator('#pix-amount-pad').getByRole('button',{name:'Dígito 0',exact:true}).click();
   assert.equal(await page.inputValue('#pix-amount'),'50');await page.locator('#pix-form button[type=submit]').click();await step(4,'pix-confirm',width);
   assert.equal(await page.locator('#pix-summary dt').count(),4);assert.match(await page.locator('#pix-summary').innerText(),/Chave Pix/);
   await page.check('#pix-data-confirm');await page.locator('[onclick="analyzePix()"]').click();await step(5,'pix-pause',width);
   await page.waitForFunction(()=>!document.getElementById('pix-continue').disabled);assert.equal(await page.locator('#pix-auth').isVisible(),false);
   await page.locator('#pix-continue').click();await step(6,'pix-auth',width);assert.equal(await page.locator('#pix-demo-code').getAttribute('type'),'password');
   for(let i=0;i<4;i++)await page.locator('#pix-code-pad').getByRole('button',{name:'Dígito 0',exact:true}).click();
   await page.check('#pix-demo-confirm');const before=await page.evaluate(()=>bankState.transactions.length);await page.locator('#pix-submit').click();await step(7,'pix-result',width);
   assert.equal(await page.evaluate(()=>bankState.transactions.length),before+1);assert.equal(await page.locator('#pix-result-details dt').count(),6);
   assert.match(await page.locator('#pix-result').innerText(),/SIMULAÇÃO — SEM VALOR FINANCEIRO/);
   await page.evaluate(()=>{Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{globalThis.sharedDemo=data.text;}});});await page.locator('#pix-share').click();
   assert.match(await page.evaluate(()=>globalThis.sharedDemo),/SIMULAÇÃO — SEM VALOR FINANCEIRO/);
   await page.locator('#pix-result [onclick="navigateTo(\'home\')"]').click();assert(await page.locator('#screen-home').isVisible());
   console.log(`PASS sequência ${width}px: 7 layouts exclusivos, catálogo, teclado monetário/código, revisão, pausa, resultado e compartilhamento simulado.`);
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
