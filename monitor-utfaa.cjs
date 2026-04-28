const { chromium } = require('@playwright/test');
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
const LOG = msg => console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`);

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  try {
    // Login
    LOG('=== Login ===');
    await page.goto('http://192.168.50.233:3100/auth');
    await page.waitForSelector('input[name="email"]', { timeout: 10000 });
    await page.locator('input[name="email"]').fill('datobig18@gmail.com');
    await page.locator('input[name="password"]').fill('666888abc');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(3000);
    LOG('  Logged in');

    // Go to UTFAA-1
    LOG('\n=== Go to UTFAA-1 ===');
    await page.goto('http://192.168.50.233:3100/UTFAA/issues/UTFAA-1');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'issue-page.png', fullPage: true });
    LOG('  URL: ' + page.url());

    // Take screenshot for user to see current state
    await page.screenshot({ path: 'before-monitor.png', fullPage: true });
    LOG('  Screenshot: before-monitor.png');
    LOG('  Please manually: 1) Assign to CEO 2) Send Chinese message');
    LOG('  Waiting 10 seconds for manual action...');
    await sleep(10000);

    // Monitor for 3 minutes
    LOG('\n=== Monitor 3 min ===');
    for (let i = 0; i < 18; i++) {
      await sleep(10000);
      await page.reload();
      await page.waitForTimeout(2000);

      const text = await page.locator('body').textContent().catch(() => '') || '';
      const garbled = /[褰鈥睍]/.test(text);
      const chinese = /[\u4e00-\u9fff]/.test(text);

      LOG(`[${(i+1)*10}s] Chinese=${chinese} Garbled=${garbled}`);

      if (garbled) {
        LOG('\n!!!! GARBLE DETECTED !!!!!');
        LOG(text.substring(0, 500));
        await page.screenshot({ path: 'garbled.png', fullPage: true });
        break;
      }

      // Check markdown
      const mds = await page.locator('.paperclip-markdown').allTextContents();
      for (let j = 0; j < mds.length; j++) {
        const md = mds[j];
        if (/[褰鈥睍]/.test(md)) {
          LOG(`\n!!!! GARBLE IN MD[${j}] !!!!!`);
          LOG(md.substring(0, 300));
          await page.screenshot({ path: 'garbled-md.png', fullPage: true });
          break;
        }
        if (/[\u4e00-\u9fff]/.test(md) && md.length > 30) {
          LOG(`  MD[${j}] Chinese: ${md.substring(0, 100)}`);
        }
      }
    }

    if (!/[褰鈥睍]/.test(await page.locator('body').textContent().catch(() => ''))) {
      LOG('\n=== FINAL: No garbled text ===');
    }

    await page.screenshot({ path: 'final.png', fullPage: true });
    await browser.close();
    LOG('\nDone!');
  } catch (e) {
    LOG('Error: ' + e.message);
    await page.screenshot({ path: 'error.png' });
    await browser.close();
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
