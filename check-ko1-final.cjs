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

  await page.goto('http://192.168.50.233:3100/KO/issues/KO-1');
  await s(3000);
  await page.screenshot({ path: 'ko1-check.png', fullPage: true });

  const text = await page.locator('body').textContent().catch(() => '') || '';
  console.log('Garbled=' + isGarbled(text) + ' Chinese=' + /[\u4e00-\u9fff]/.test(text));

  const mds = await page.locator('.paperclip-markdown').allTextContents();
  console.log('Total MD blocks:', mds.length);
  for (let i = 0; i < mds.length; i++) {
    const g = isGarbled(mds[i]);
    const c = /[\u4e00-\u9fff]/.test(mds[i]);
    console.log('MD[' + i + '] garbled=' + g + ' chinese=' + c);
    if (g) {
      console.log('  GARBLED: ' + mds[i].substring(0, 200));
    } else if (c) {
      console.log('  Chinese: ' + mds[i].substring(0, 200));
    }
  }

  await browser.close();
}

main().catch(console.error);
