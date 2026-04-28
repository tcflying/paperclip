const { chromium } = require('@playwright/test');
const s = ms => new Promise(r => setTimeout(r, ms));

function isGarbled(s) {
  if (!s) return false;
  if (/[褰鈥睍]/.test(s)) return true;
  if (/[��]/.test(s) && /[\x80-\xBF]/.test(s)) return true;
  return false;
}

async function main() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto('http://192.168.50.233:3100/auth');
  await page.waitForSelector('input[name="email"]', { timeout: 5000 });
  await page.locator('input[name="email"]').fill('datobig18@gmail.com');
  await page.locator('input[name="password"]').fill('666888abc');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  console.log('Logged in');

  // Check KO-1
  console.log('\n=== KO-1 ===');
  await page.goto('http://192.168.50.233:3100/KO/issues/KO-1');
  await s(2000);
  await page.screenshot({ path: 'ko1-new.png', fullPage: true });
  const text1 = await page.locator('body').textContent().catch(() => '') || '';
  console.log('Garbled=' + isGarbled(text1) + ' Chinese=' + /[\u4e00-\u9fff]/.test(text1));
  const mds1 = await page.locator('.paperclip-markdown').allTextContents();
  for (let i = 0; i < mds1.length; i++) {
    if (isGarbled(mds1[i])) {
      console.log('MD[' + i + '] GARBLED: ' + mds1[i].substring(0, 100));
    }
  }

  // Check KO-3
  console.log('\n=== KO-3 ===');
  await page.goto('http://192.168.50.233:3100/KO/issues/KO-3');
  await s(2000);
  await page.screenshot({ path: 'ko3.png', fullPage: true });
  const text3 = await page.locator('body').textContent().catch(() => '') || '';
  console.log('Garbled=' + isGarbled(text3) + ' Chinese=' + /[\u4e00-\u9fff]/.test(text3));
  const mds3 = await page.locator('.paperclip-markdown').allTextContents();
  for (let i = 0; i < mds3.length; i++) {
    const g = isGarbled(mds3[i]);
    const c = /[\u4e00-\u9fff]/.test(mds3[i]);
    console.log('MD[' + i + '] garbled=' + g + ' chinese=' + c + ': ' + mds3[i].substring(0, 100));
  }

  await browser.close();
}

main().catch(console.error);
