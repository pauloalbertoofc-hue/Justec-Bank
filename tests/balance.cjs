const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try {
 const p=await b.newPage({viewport:{width:390,height:900}});await require('./resources.cjs')(p);const errors=[],failed=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('requestfailed',r=>failed.push(r.url()));
 const response=await p.goto(process.env.JUSTEC_TEST_URL || 'http://127.0.0.1:8000/',{waitUntil:'networkidle'});assert.equal(response.status(),200);
 const text=async s=>(await p.locator(s).textContent()).trim().replace(/\u00a0/g,' ');
 assert.equal(await text('#balance-display'),'R$ 2.480,50');
 assert.equal(await p.locator('#eye-icon').getAttribute('class'),'fa-solid fa-eye');
 await p.locator('#balance-toggle').click({force:true});
 assert.equal(await text('#balance-display'),'R$ ••••••');
 assert.equal(await p.locator('#eye-icon').getAttribute('class'),'fa-solid fa-eye-slash');
 assert.equal(await p.locator('#balance-toggle').getAttribute('aria-label'),'Exibir saldo');
 await p.locator('#nav-btn-rights').click({force:true});await p.locator('#nav-btn-home').click({force:true});
 assert.equal(await text('#balance-display'),'R$ ••••••');
 await p.locator('#balance-toggle').click({force:true});
 assert.equal(await text('#balance-display'),'R$ 2.480,50');assert.equal(await p.locator('#eye-icon').getAttribute('class'),'fa-solid fa-eye');
 assert.equal(await p.locator('#balance-toggle').getAttribute('aria-label'),'Ocultar saldo');
 console.log('PASS saldo inicial, ocultar, preservar na navegação, revelar e ícones/aria-label');
 for(const [id,target] of [['home','home'],['pix','pix'],['screening','screening'],['action','action-post'],['rights','rights']]){
 await p.locator('#nav-btn-'+id).click({force:true});assert.equal(await p.locator('#screen-'+target).evaluate(el=>el.classList.contains('hidden')),false);
 assert.equal(await p.locator('[id^="screen-"]:not(.hidden)').count(),1);
 }
 await p.locator('#header-security').click({force:true});await p.locator('#screen-security [onclick="navigateTo(\'edu-center\')"]').click({force:true});assert.equal(await p.locator('#screen-edu-center').evaluate(e=>e.classList.contains('hidden')),false);
 console.log('PASS navegação nas seis telas');
 await p.locator('#nav-btn-screening').click({force:true});
 for(const [kind,title] of [['bank_call','Falsa Central do Banco'],['whatsapp','Golpe do Falso Parente'],['offer','Oferta Suspeita em Rede Social']]){
 await p.locator(`[onclick="showDiagnosis('${kind}')"]`).click({force:true});assert.equal(await text('#modal-title'),title);assert.equal(await p.locator('#app-modal').evaluate(e=>e.classList.contains('hidden')),false);await p.locator('#modal-close-btn').click({force:true});assert.equal(await p.locator('#app-modal').evaluate(e=>e.classList.contains('hidden')),true);
 }
 console.log('PASS três diagnósticos de triagem e abrir/fechar modais');
 await p.locator('#nav-btn-action').click({force:true});await p.locator('[onclick="openMedWizard()"]').click({force:true});assert.equal(await text('#modal-title'),'Roteiro de Texto para o Banco');await p.locator('#modal-close-btn').click({force:true});
 console.log('PASS orientação MED; novo Pix validado em tests/pix.cjs');
 await p.reload({waitUntil:'networkidle'});assert.equal(await text('#balance-display'),'R$ 2.480,50');
 assert.deepEqual(errors.filter(e=>e!=='tailwind is not defined'),[]);
 console.log('PASS reinicialização ao recarregar e ausência de outros erros JS');
 console.log('EXTERNAL_REQUEST_FAILURES',JSON.stringify([...new Set(failed)]));console.log('PAGE_ERRORS',JSON.stringify(errors));
 } finally {await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
