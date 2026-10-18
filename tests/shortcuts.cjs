const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try {
  const page=await browser.newPage();await require('./resources.cjs')(page);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.JUSTEC_TEST_URL||'http://127.0.0.1:8000/',{waitUntil:'networkidle'});
  let count=0;
  async function verify(selector,target){await page.locator(selector).click();assert(await page.locator('#screen-'+target).isVisible());assert.equal(await page.locator('[id^="screen-"]:not(.hidden)').count(),1);count++;}
  for(const width of [390,1366]){
   await page.setViewportSize({width,height:900});
   for(const [label,target] of [['Fazer Pix','pix'],['Consultar movimentações','statement'],['Verificar chave Pix','protection'],['Bloqueios preventivos','protection'],['Contestações','reviews'],['Central de segurança','security']]){
    await page.locator('.app-header a').click();
    await page.locator('#home-services').getByRole('button',{name:label,exact:true}).click();
    assert(await page.locator('#screen-'+target).isVisible());count++;
   }
   await verify('#header-security','security');
   for(const target of ['protection','reviews','edu-center','screening','action-post']){
    await page.locator('#header-security').click();await verify(`#screen-security [onclick="navigateTo('${target}')"]`,target);
   }
   await page.locator('.app-header a').click();await verify('#screen-home .statement-link','statement');
   for(const target of ['screening','action-post']){
    await page.locator('.app-header a').click();await verify(`#home-security [onclick="navigateTo('${target}')"]`,target);
   }
   await page.evaluate(()=>navigateTo('rights'));await verify('#rights-med-guide','action-post');
   await page.locator('[onclick="openMedWizard()"]').click();assert.match(await page.locator('#modal-title').innerText(),/Roteiro/);await page.locator('#modal-close-btn').click();count++;
   const nav=width<1024?'#mobile-nav':'#desktop-nav';
   const destinations=await page.locator(nav+' [data-nav-screen]').evaluateAll(buttons=>buttons.map(b=>b.dataset.navScreen));
   for(const target of destinations)await verify(`${nav} [data-nav-screen="${target}"]`,target);
  }
  assert.deepEqual(errors,[]);console.log(`PASS ${count} verificações: serviços Home, cabeçalho, Central, Rota da Segurança, extrato, Direitos/MED e menus mobile/desktop. Sem erros JavaScript.`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
