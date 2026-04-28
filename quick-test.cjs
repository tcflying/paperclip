const { chromium } = require('@playwright/test');
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
const LOG = msg => console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`);

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  try {
    await page.goto('http://192.168.50.233:3100/auth');
    await page.waitForSelector('input[name="email"]', { timeout: 5000 });
    await page.locator('input[name="email"]').fill('datobig18@gmail.com');
    await page.locator('input[name="password"]').fill('666888abc');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    LOG('Logged in');

    await page.goto('http://192.168.50.233:3100/UTFAA/issues/UTFAA-1');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '1.png', fullPage: true });
    LOG('On issue');

    // Assign
    await page.locator('button:has-text("Assign")').first().click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: '2-dropdown.png' });
    await page.locator('button:has-text("CEO")').first().click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: '3-ceo.png' });
    LOG('Assigned CEO');

    // Click first paperclip-mdxeditor-content DIV and type
    const editor = page.locator('.paperclip-mdxeditor-content').first();
    await editor.click();
    await page.waitForTimeout(300);
    await page.keyboard.type('请用中文回复：你好世界、招聘计划已完成、筛选阶段开始');
    LOG('Typed message');
    await page.screenshot({ path: '4-typed.png' });

    // Send
    const sendBtn = page.locator('button:has-text("Send")').first();
    if (await sendBtn.isEnabled().catch(() => false)) {
      await sendBtn.click();
      LOG('Clicked Send');
    } else {
      await page.keyboard.press('Enter');
      LOG('Pressed Enter');
    }
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '5-sent.png', fullPage: true });

    // Monitor 1 min
    LOG('\nMonitor:');
    for (let i = 0; i < 6; i++) {
      await sleep(10000);
      await page.reload();
      await page.waitForTimeout(1000);
      const text = await page.locator('body').textContent().catch(() => '') || '';
      const garbled = /[褰鈥睍]/.test(text);
      const chinese = /[\u4e00-\u9fff]/.test(text);
      LOG(`[${(i+1)*10}s] Chinese=${chinese} Garbled=${garbled}`);
      if (garbled) {
        LOG('!!!! GARBLE !!!!');
        await page.screenshot({ path: 'garbled.png', fullPage: true });
        break;
      }
      // Check markdown
      const mds = await page.locator('.paperclip-markdown').allTextContents();
      for (let j = 0; j < mds.length; j++) {
        const md = mds[j];
        if (/[褰鈥睍]/.test(md)) {
          LOG(`!!!! GARBLE IN MD[${j}] !!!!`);
          LOG(md.substring(0, 200));
          await page.screenshot({ path: 'garbled-md.png', fullPage: true });
          break;
        }
      }
    }

    await page.screenshot({ path: 'final.png', fullPage: true });
    await browser.close();
    LOG('Done');
  } catch (e) {
    LOG('Error: ' + e.message);
    await page.screenshot({ path: 'error.png' });
    await browser.close();
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
