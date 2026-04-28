const { chromium } = require('@playwright/test');
const s = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto('http://localhost:3100/auth');
  await page.waitForSelector('input[name="email"]', { timeout: 5000 });
  await page.locator('input[name="email"]').fill('datobig18@gmail.com');
  await page.locator('input[name="password"]').fill('666888abc');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/dashboard', { timeout: 10000 });

  // Check UTFAAAAA-1
  await page.goto('http://localhost:3100/UTFAAAAA/issues/UTFAAAAA-1');
  await s(3000);
  await page.screenshot({ path: 'check-utfaaaa-1.png', fullPage: true });
  
  const text = await page.locator('body').textContent().catch(() => '') || '';
  const garbled = /[褰鈥睍]/.test(text);
  const chinese = /[\u4e00-\u9fff]/.test(text);
  console.log('UTFAAAA-1: Chinese=' + chinese + ' Garbled=' + garbled);
  console.log(text.substring(0, 300));
  
  // Check all markdown
  const mds = await page.locator('.paperclip-markdown').allTextContents();
  for (let i = 0; i < mds.length; i++) {
    const g = /[褰鈥睍]/.test(mds[i]);
    const c = /[\u4e00-\u9fff]/.test(mds[i]);
    console.log('MD[' + i + ']: garbled=' + g + ' chinese=' + c + ': ' + mds[i].substring(0, 200));
  }

  await browser.close();
}

main().catch(console.error);
