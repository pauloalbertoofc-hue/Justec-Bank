const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage();await require('./resources.cjs')(page);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.JUSTEC_TEST_URL||'http://127.0.0.1:8000/',{waitUntil:'networkidle'});
  await page.evaluate(()=>pixConfig.reflectionMs=40);const flow=require('./pix-helpers.cjs')(page);
  const snapshot=()=>page.evaluate(()=>({balance:bankState.balance,transactions:bankState.transactions.length,attempts:bankState.attempts.length}));
  assert.deepEqual(await snapshot(),{balance:2480.5,transactions:12,attempts:0});
  assert.deepEqual(await page.evaluate(()=>['000.000.000-00','00.000.000/0000-00','+5511900000000','escola@example.invalid','00000000-0000-0000-0000-000000000000'].map(isDemoKey)),[true,true,true,true,true]);
  await flow.open();await page.locator('[onclick="analyzePix()"]').click();assert.match(await page.locator('#pix-feedback').innerText(),/Confirme explicitamente/);
  await flow.analyze();assert.match(await page.locator('#pix-risk').innerText(),/Baixo risco/);await flow.pause();await page.locator('#pix-continue').click();
  assert.equal(await page.locator('#pix-submit').isDisabled(),true);await page.evaluate(()=>completePix());assert.match(await page.locator('#pix-feedback').innerText(),/Confirme a operação/);
  await page.fill('#pix-demo-code','0000');await page.check('#pix-demo-confirm');await page.locator('#pix-submit').click();
  assert.deepEqual(await snapshot(),{balance:2430.5,transactions:13,attempts:0});
  await page.evaluate(()=>{completePix();completePix();});assert.equal((await snapshot()).transactions,13);
  await page.locator('#pix-receipt').click();assert.match(await page.locator('#statement-dialog').innerText(),/SIMULAÇÃO — SEM VALOR FINANCEIRO/);
  assert.match(await page.locator('#receipt-details').innerText(),/50,00/);assert.match(await page.locator('#statement-list').innerText(),/Pix enviado · simulação/);
  await page.locator('.receipt-close').click();assert.equal(await page.evaluate(()=>calculateTotals(bankState.transactions).outgoing),1219.5);
  await flow.open('demo-medium','60,00');await flow.analyze();assert.match(await page.locator('#pix-risk').innerText(),/Risco moderado/);
  await flow.answers();await page.locator('#pix-start-pause').click();assert.equal(await page.locator('#pix-auth').isVisible(),false);assert.match(await page.locator('#pix-feedback').innerText(),/Confirme que entendeu/);
  await page.check('#pix-extra');await page.locator('#pix-start-pause').click();await flow.auth();assert.deepEqual(await snapshot(),{balance:2370.5,transactions:14,attempts:0});
  await flow.open('demo-high','70,00');await flow.analyze();assert.match(await page.locator('#pix-result-text').innerText(),/sem desconto/);assert.equal(await page.locator('#pix-triage').isVisible(),false);assert.deepEqual(await snapshot(),{balance:2370.5,transactions:14,attempts:1});
  await page.evaluate(()=>{completePix();analyzePix();});assert.equal((await snapshot()).attempts,1);
  await flow.open('demo-high','70,00');await flow.analyze();assert.equal((await snapshot()).attempts,2);
  assert.equal(await page.evaluate(()=>evaluateRisk(demoRecipients[2],70).reasons.some(r=>r.includes('Duas ou mais'))),true);
  for(const value of ['0','-1','abc','1,234','1e3','2.001,00']){await flow.open('demo-low',value);assert.equal(await page.locator('#pix-confirm').isVisible(),false);}
  await page.evaluate(()=>bankState.transactions.push({id:'TEST-DRAIN',amount:-2000,date:demoDate(),status:'completed',type:'payment',description:'Teste',participant:{name:'Teste',institution:'Teste'}}));
  await flow.open('demo-low','500,00');assert.match(await page.locator('#pix-feedback').innerText(),/insuficiente/);await page.evaluate(()=>bankState.transactions.pop());assert.equal((await snapshot()).balance,2370.5);
  await flow.open();await page.locator('[onclick="editPixDetails()"]').click();await page.fill('#pix-amount','100,00');assert.equal(await page.locator('#pix-confirm').isVisible(),false);
  await page.evaluate(()=>navigateTo('reviews'));
  const card=name=>page.locator('#review-list article').filter({hasText:name});
  await card('Escola D').getByRole('button',{name:'Solicitar revisão simulada'}).click();assert.match(await page.locator('#review-feedback').innerText(),/10 a 500/);
  await card('Escola D').locator('textarea').fill('Cadastro fictício reconhecido, solicitar reavaliação educativa.');
  await card('Escola D').getByRole('button',{name:'Solicitar revisão simulada'}).click();assert.match(await card('Escola D').innerText(),/Status: Revisão solicitada/);
  await card('Escola D').getByRole('button',{name:'Simular início da análise'}).click();assert.match(await card('Escola D').innerText(),/Status: Em análise/);
  await card('Escola D').getByRole('button',{name:'Exibir resultado demonstrativo'}).click();assert.match(await card('Escola D').innerText(),/Status: Restrição retirada/);
  await flow.open('demo-false','20,00');await flow.analyze();await flow.auth();assert.deepEqual(await snapshot(),{balance:2350.5,transactions:15,attempts:2});
  await page.evaluate(()=>navigateTo('reviews'));await card('Escola C').locator('textarea').fill('Revisão educativa no cenário de restrição mantida.');
  for(const name of ['Solicitar revisão simulada','Simular início da análise','Exibir resultado demonstrativo'])await card('Escola C').getByRole('button',{name}).click();assert.match(await card('Escola C').innerText(),/Status: Restrição mantida/);
  await page.evaluate(()=>openPixFlow());await page.locator('[data-pix-method="key"]').click();await page.fill('#pix-key','inexistente@example.invalid');await page.locator('#pix-lookup').click();assert.match(await page.locator('#pix-feedback').innerText(),/inexistente/);
  await page.fill('#pix-key','LOJA-C@EXAMPLE.INVALID');await page.locator('#pix-lookup').click();await page.locator('#pix-recipient-next').click();await page.fill('#pix-amount','10,00');await page.locator('#pix-form button[type=submit]').click();await flow.analyze();
  assert.equal(await page.evaluate(()=>pixDraft.recipient.id),'demo-high');assert.equal(await page.evaluate(()=>pixDraft.stage),'interrupted');assert.equal((await snapshot()).attempts,3);assert.equal((await snapshot()).balance,2350.5);
  assert.equal(await page.evaluate(()=>JSON.stringify(bankState).includes('loja-c@example.invalid')),false);
  assert.equal(await page.evaluate(()=>evaluateRisk({id:'isolated',flags:{internalAlert:true}},50).level),'moderate');
  await page.reload({waitUntil:'networkidle'});assert.deepEqual(await snapshot(),{balance:2480.5,transactions:12,attempts:0});assert.deepEqual(errors,[]);
  console.log('PASS Pix financeiro: baixo/moderado/elevado, validação, limite/saldo, débito único, extrato/comprovante, interrupção, repetição, revisão e falso positivo, chave local/mascarada, reinício. Sem erros JavaScript.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
