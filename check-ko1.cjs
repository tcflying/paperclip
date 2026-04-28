const { chromium } = require('@playwright/test');
const s = ms => new Promise(r => setTimeout(r, ms));

function isGarbled(s) {
  if (!s) return false;
  // Original pattern
  if (/[褰鈥睍]/.test(s)) return true;
  // Common mojibake patterns
  if (/\xC2[\x80-\xBF]/.test(s)) return true;
  if (/[丿伢再冚札格矫].{1,3}[\x80-\xBF]/.test(s)) return true;
  // Replacement char followed by likely garbled
  if (/�/.test(s) && /[\x80-\xBF]/.test(s)) return true;
  // Question marks in Chinese context
  if (/[��]/.test(s) && /[׼Ƹĸ]/.test(s)) return true;
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
  await page.goto('http://192.168.50.233:3100/KO/issues/KO-1');
  await s(3000);
  await page.screenshot({ path: 'ko1.png', fullPage: true });

  const text = await page.locator('body').textContent().catch(() => '') || '';
  const garbled = isGarbled(text);
  const chinese = /[\u4e00-\u9fff]/.test(text);
  console.log('KO-1: Chinese=' + chinese + ' Garbled=' + garbled);
  console.log(text.substring(0, 500));

  const mds = await page.locator('.paperclip-markdown').allTextContents();
  for (let i = 0; i < mds.length; i++) {
    const g = isGarbled(mds[i]);
    const c = /[\u4e00-\u9fff]/.test(mds[i]);
    console.log('MD[' + i + ']: garbled=' + g + ' chinese=' + c);
    if (mds[i].includes('�') || /[\x80-\xBF]{2,}/.test(mds[i])) {
      console.log('  SUSPICIOUS CHARS: ' + mds[i].substring(0, 200));
    }
  }

  await browser.close();
}

main().catch(console.error);
