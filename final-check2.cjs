const { chromium } = require('@playwright/test');
const s = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto('http://192.168.50.233:3100/auth');
  await page.waitForSelector('input[name="email"]', { timeout: 8000 });
  await page.locator('input[name="email"]').fill('datobig18@gmail.com');
  await page.locator('input[name="password"]').fill('666888abc');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  console.log('Logged in');
  
  await page.goto('http://192.168.50.233:3100/FINA/issues/FINA-1');
  await s(3000);
  
  const text = await page.locator('main').textContent().catch(() => '');
  const garbled = /[褰鈥睍]/.test(text);
  const chinese = /[\u4e00-\u9fff]/.test(text);
  console.log('garbled=' + garbled + ' chinese=' + chinese);
  console.log(text.substring(0, 300));
  
  const mds = await page.locator('.paperclip-markdown').allTextContents();
  console.log(mds.length + ' markdown blocks');
  for (let i = 0; i < mds.length; i++) {
    const g = /[褰鈥睍]/.test(mds[i]);
    const c = /[\u4e00-\u9fff]/.test(mds[i]);
    if (g || c) console.log('[' + i + '] garbled=' + g + ' chinese=' + c + ': ' + mds[i].substring(0, 100));
  }
  
  await page.screenshot({ path: 'final-check.png', fullPage: true });
  await browser.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
