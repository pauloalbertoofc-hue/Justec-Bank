module.exports = page => ({
 async open(recipient='demo-low',value='50,00') {
  await page.evaluate(()=>openPixFlow());await page.locator('[data-pix-method="recipient"]').click();await page.selectOption('#pix-recipient',recipient);await page.locator('#pix-lookup').click();await page.locator('#pix-recipient-next').click();
  await page.fill('#pix-amount',value);await page.locator('#pix-form button[type=submit]').click();
 },
 async analyze(){await page.check('#pix-data-confirm');await page.locator('[onclick="analyzePix()"]').click();},
 async answers(values={}) {
  for(const [key,value] of Object.entries({identity:'yes',urgency:'no',advance:'no',ignore:'no',...values}))await page.selectOption('#pix-'+key,value);
  await page.locator('#pix-check-context').click();
 },
 async pause(){
  if(await page.locator('#pix-triage').isVisible()) {
   await this.answers();if(await page.locator('#pix-extra-label').isVisible())await page.check('#pix-extra');
   await page.locator('#pix-start-pause').click();
  }
  await page.waitForFunction(()=>!document.getElementById('pix-continue').disabled);
 },
 async auth(){await this.pause();await page.locator('#pix-continue').click();await page.fill('#pix-demo-code','0000');await page.check('#pix-demo-confirm');await page.locator('#pix-submit').click();}
});
