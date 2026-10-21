const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const p=await b.newPage();await require('./resources.cjs')(p);const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(process.env.JUSTEC_TEST_URL||'http://127.0.0.1:8000/',{waitUntil:'networkidle'});
  for(const width of [390,1366]){
   await p.setViewportSize({width,height:900});await p.evaluate(()=>navigateTo('action-post'));
   if (!await p.locator('#guard-about').evaluate(el=>el.open)) await p.locator('#guard-about > summary').click();
   const guide=p.locator('#guard-operation-guide');const text=await guide.innerText();
   assert.equal(await guide.locator('article').count(),4);
   assert.match(text,/risco moderado exige confirmação adicional/);
   assert.match(text,/risco elevado interrompe a transferência/);
   assert.match(text,/restrição interna simulada impede novos envios/);
   assert.match(text,/A conta do usuário não é bloqueada/);
   assert.match(text,/chave não é bloqueada no DICT/);
   assert.match(text,/não desconta o saldo fictício/);
   assert.match(text,/não gera comprovante/);
   assert.match(text,/Revisão solicitada → Em análise/);
   assert.match(text,/Restrição mantida ou Restrição retirada/);
   assert.match(text,/histórico da revisão permanecem disponíveis/);
   assert.doesNotMatch(await p.locator('#screen-action-post').innerText(),/Bloqueio Preventivo da Conta|solicite o bloqueio temporário|aumenta consideravelmente/);
   assert.equal(await guide.locator('#med-emergency-guide').count(),0);
   assert.match(await p.locator('#med-emergency-guide').innerText(),/solicite avaliação do MED quando cabível/);
   for(const target of ['protection','security','reviews']){
    await p.evaluate(()=>navigateTo('action-post'));
    await p.locator(`#guard-operation-guide [onclick="navigateTo('${target}')"]`).click();
    assert(await p.locator('#screen-'+target).isVisible());
   }
   await p.evaluate(()=>navigateTo('rights'));
   assert.doesNotMatch(await p.locator('#screen-rights').innerText(),/contas bancárias de estelionatários/);
   await p.locator('#rights-med-guide').click();
   await p.locator('[onclick="openMedWizard()"]').click();
   const modal=await p.locator('#modal-desc').innerText();
   assert.match(modal,/solicito avaliação|Solicito avaliação/);
   assert.match(modal,/Nenhum pedido foi enviado/);
   assert.doesNotMatch(modal,/Resolução BCB nº 103\/2021|abertura imediata/);
   await p.locator('#modal-close-btn').click();
  }
  // A explicação precisa corresponder ao comportamento efetivo da interrupção.
  const before=await p.evaluate(()=>({balance:bankState.balance,count:bankState.transactions.length,attempts:bankState.attempts.length}));
  await p.evaluate(()=>openPixFlow('suspicious'));await p.locator('[data-pix-method="recipient"]').click();await p.locator('#pix-lookup').click();await p.locator('#pix-recipient-next').click();await p.fill('#pix-amount','50,00');await p.locator('#pix-form button[type=submit]').click();
  await p.check('#pix-data-confirm');await p.locator('[onclick="analyzePix()"]').click();
  await p.waitForFunction(()=>pixDraft?.stage==='interrupted');
  assert.equal(await p.locator('#pix-receipt').isVisible(),false);
  const after=await p.evaluate(()=>({balance:bankState.balance,count:bankState.transactions.length,attempts:bankState.attempts.length}));
  assert.equal(after.balance,before.balance);assert.equal(after.count,before.count);assert.equal(after.attempts,before.attempts+1);
  assert.deepEqual(errors,[]);
  await p.evaluate(()=>navigateTo('action-post'));await p.screenshot({path:'/tmp/justec-guard-guide-corrected.png',fullPage:true});
  console.log('PASS conteúdo 390/1366: interrupção, restrição interna, conta/DICT, saldo, revisão, MED separado, atalhos e roteiro. Interrupção real do simulador sem débito/lançamento/comprovante. Sem erros JavaScript.');
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
