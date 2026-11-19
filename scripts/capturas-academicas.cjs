const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const base = 'https://justec-bank.vercel.app/';
(async()=>{
 const browser=await chromium.launch({headless:true});
 for(const [name,viewport] of Object.entries({mobile:{width:390,height:844},desktop:{width:1440,height:1000}})){
 const dir=path.join('capturas',name);fs.mkdirSync(dir,{recursive:true});
 const context=await browser.newContext({viewport,locale:'pt-BR',deviceScaleFactor:1});
 const page=await context.newPage();const report=[];let n=0;
 async function shot(label){await page.waitForTimeout(700);const file=String(++n).padStart(2,'0')+'-'+label+'.png';await page.screenshot({path:path.join(dir,file),fullPage:true});report.push({file,url:page.url()});}
 const targets=['Tenho dúvida','Sofri um golpe','Fazer Pix','Consultar movimentações','Verificar chave Pix','Bloqueios preventivos','Contestações','Central de segurança','Direitos','Perfil','Minha conta','Entrar','Criar conta'];
 await page.goto(base,{waitUntil:'domcontentloaded'});await shot('inicio');
 for(const label of targets){try{await page.goto(base,{waitUntil:'domcontentloaded'});const target=page.getByText(label,{exact:true}).first();await target.waitFor({state:'visible',timeout:3500});await target.click({timeout:3500});await shot(label.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-'));}catch(e){report.push({label,status:'nao capturado',reason:String(e).slice(0,300)});}}
 fs.writeFileSync(path.join(dir,'registro.json'),JSON.stringify(report,null,2));await context.close();
 }await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
