const { chromium } = require('@playwright/test');
const s = ms => new Promise(r => setTimeout(r, ms));
const LOG = msg => console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`);

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 150 });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  try {
    LOG('=== Login ===');
    await page.goto('http://localhost:3100/auth');
    await page.waitForSelector('input[name="email"]', { timeout: 5000 });
    await page.locator('input[name="email"]').fill('datobig18@gmail.com');
    await page.locator('input[name="password"]').fill('666888abc');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.screenshot({ path: '1-login.png', fullPage: true });
    LOG('  Logged in!');

    // Go to UTF8Verify dashboard
    LOG('\n=== Go to UTF8Verify dashboard ===');
    await page.goto('http://localhost:3100/UTFAAAA/dashboard');
    await s(3000);
    await page.screenshot({ path: '2-dashboard.png', fullPage: true });
    LOG('  URL: ' + page.url());

    // Check page content
    const text = await page.locator('body').textContent().catch(() => '') || '';
    const garbled = /[褰鈥睍]/.test(text);
    const chinese = /[\u4e00-\u9fff]/.test(text);
    LOG(`  Chinese=${chinese} Garbled=${garbled}`);
    LOG('  Text: ' + text.substring(0, 200));

    // Monitor
    LOG('\n=== Monitoring ===');
    for (let i = 0; i < 36; i++) {
      await s(10000);
      await page.reload();
      await s(2000);
      
      const body = await page.locator('body').textContent().catch(() => '') || '';
      const g = /[褰鈥睍]/.test(body);
      const c = /[\u4e00-\u9fff]/.test(body);
      
      LOG(`[${(i+1)*10}s] Chinese=${c} Garbled=${g}`);
      
      if (g) {
        LOG('\n!!!! GARBLE DETECTED !!!!!');
        await page.screenshot({ path: 'GARBLED.png', fullPage: true });
        LOG(body.substring(0, 500));
        break;
      }

      const mds = await page.locator('.paperclip-markdown').allTextContents();
      for (let j = 0; j < mds.length; j++) {
        if (/[褰鈥睍]/.test(mds[j])) {
          LOG(`\n!!!! GARBLE IN MD[${j}] !!!!!`);
          await page.screenshot({ path: 'GARBLED-MD.png', fullPage: true });
          LOG(mds[j].substring(0, 300));
          break;
        }
        if (/[\u4e00-\u9fff]/.test(mds[j]) && mds[j].length > 20) {
          LOG(`  MD[${j}] Chinese: ${mds[j].substring(0, 100)}`);
        }
      }
    }

    // Final
    LOG('\n=== FINAL ===');
    await page.screenshot({ path: 'FINAL.png', fullPage: true });
    const finalText = await page.locator('body').textContent().catch(() => '') || '';
    const finalGarbled = /[褰鈥睍]/.test(finalText);
    const finalChinese = /[\u4e00-\u9fff]/.test(finalText);
    LOG(`Garbled=${finalGarbled} Chinese=${finalChinese}`);

    if (!finalGarbled) {
      LOG('\n✅ NO GARBLE - 测试通过！浏览器保持打开。');
    } else {
      LOG('\n❌ GARBLE DETECTED - 测试失败！');
    }

    await new Promise(() => {});

  } catch (e) {
    LOG('ERROR: ' + e.message);
    await page.screenshot({ path: 'ERROR.png', fullPage: true });
    await new Promise(() => {});
  }
}

main();
