const { chromium } = require('@playwright/test');
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
const LOG = msg => console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`);

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  try {
    // Login
    LOG('=== Login ===');
    await page.goto('http://192.168.50.233:3100/auth');
    await page.waitForSelector('input[name="email"]', { timeout: 10000 });
    await page.locator('input[name="email"]').fill('datobig18@gmail.com');
    await page.locator('input[name="password"]').fill('666888abc');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    LOG('  Done');

    // Go to UTFAA-1
    LOG('\n=== Go to UTFAA-1 ===');
    await page.goto('http://192.168.50.233:3100/UTFAA/issues/UTFAA-1');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '1-issue.png', fullPage: true });

    // Assign to CEO
    LOG('\n=== Assign to CEO ===');
    await page.locator('button:has-text("Assign")').first().click();
    await page.waitForTimeout(1000);
    await page.locator('button:has-text("CEO")').first().click();
    await page.waitForTimeout(1000);
    LOG('  Assigned');
    await page.screenshot({ path: '2-ceo.png' });

    // Type comment in contenteditable div
    LOG('\n=== Type comment ===');
    // Find contenteditable div
    const editor = page.locator('[contenteditable="true"]').first();
    if (await editor.isVisible().catch(() => false)) {
      await editor.click();
      await editor.fill('请用中文回复以下问题：1. 你好世界 2. 招聘计划已完成 3. 筛选阶段开始');
      LOG('  Typed in contenteditable');
    } else {
      // Try finding the editor differently
      const editorByRole = page.locator('[role="textbox"]').first();
      if (await editorByRole.isVisible().catch(() => false)) {
        await editorByRole.click();
        await editorByRole.fill('请用中文回复以下问题：1. 你好世界 2. 招聘计划已完成 3. 筛选阶段开始');
        LOG('  Typed in textbox');
      } else {
        // Log all editable elements
        const editables = await page.locator('[contenteditable], [role="textbox"]').all();
        LOG(`  Found ${editables.length} editable elements`);
        for (let i = 0; i < editables.length; i++) {
          const visible = await editables[i].isVisible().catch(() => false);
          const tag = await editables[i].evaluate(el => el.tagName);
          LOG(`    [${i}] <${tag}> visible=${visible}`);
          if (visible) {
            await editables[i].click();
            await editables[i].fill('请用中文回复以下问题：1. 你好世界 2. 招聘计划已完成 3. 筛选阶段开始');
            LOG('  Typed in editable[' + i + ']');
            break;
          }
        }
      }
    }
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '3-comment.png' });

    // Send
    LOG('\n=== Send ===');
    const sendBtn = page.locator('button:has-text("Send")').first();
    if (await sendBtn.isEnabled().catch(() => false)) {
      await sendBtn.click();
      LOG('  Clicked Send');
    } else {
      await page.keyboard.press('Enter');
      LOG('  Pressed Enter');
    }
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '4-sent.png' });

    // Monitor
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
      LOG('\n=== NO GARBLE ===');
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
