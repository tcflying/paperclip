const { chromium } = require('@playwright/test');
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
const LOG = (msg) => console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`);

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  try {
    // 1. Login
    LOG('=== Step 1: Login ===');
    await page.goto('http://192.168.50.233:3100/auth');
    await page.waitForSelector('input[name="email"]', { timeout: 10000 });
    await page.locator('input[name="email"]').fill('datobig18@gmail.com');
    await page.locator('input[name="password"]').fill('666888abc');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(3000);
    LOG('  Logged in');

    // 2. Go to UTFAA-1 issue
    LOG('\n=== Step 2: Navigate to UTFAA-1 ===');
    await page.goto('http://192.168.50.233:3100/UTFAA/issues/UTFAA-1');
    await page.waitForTimeout(3000);
    LOG('  URL: ' + page.url());
    await page.screenshot({ path: 'step2-issue.png', fullPage: true });

    // 3. Click Assignee to assign to CEO
    LOG('\n=== Step 3: Click Assignee ===');
    // Find and click assignee area
    const assigneeAreas = await page.locator('[class*="assignee"], [data-field*="assignee"], button:has-text("Assign")').all();
    LOG('  Found ' + assigneeAreas.length + ' assignee elements');
    for (let i = 0; i < assigneeAreas.length; i++) {
      const text = await assigneeAreas[i].textContent().catch(() => '');
      LOG('    [' + i + ']: "' + text.trim().substring(0, 50) + '"');
    }
    if (assigneeAreas.length > 0) {
      await assigneeAreas[0].click();
      LOG('  Clicked assignee');
    }
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'step3-assignee-popover.png' });

    // 4. Select CEO
    LOG('\n=== Step 4: Select CEO ===');
    const ceoOptions = await page.locator('text=CEO').all();
    LOG('  Found ' + ceoOptions.length + ' CEO options');
    if (ceoOptions.length > 0) {
      await ceoOptions[0].click();
      LOG('  Clicked CEO');
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'step4-ceo-selected.png' });
    }

    // 5. Find message/comment input
    LOG('\n=== Step 5: Find message input ===');
    // List all inputs and textareas
    const allInputs = await page.locator('input, textarea').all();
    LOG('  Found ' + allInputs.length + ' inputs/textareas');
    for (let i = 0; i < allInputs.length; i++) {
      const tag = await allInputs[i].evaluate(el => el.tagName);
      const ph = await allInputs[i].getAttribute('placeholder').catch(() => '');
      const visible = await allInputs[i].isVisible().catch(() => false);
      LOG('    [' + i + '] <' + tag + '> visible=' + visible + ' placeholder="' + ph + '"');
    }

    // Find the comment/message input
    const commentInput = page.locator('textarea').first();
    if (await commentInput.isVisible().catch(() => false)) {
      await commentInput.fill('请用中文回复以下问题：1. 你好世界 2. 招聘计划已完成 3. 筛选阶段开始');
      LOG('  Typed message in textarea');
    } else {
      // Try the first visible textarea
      for (let i = 0; i < allInputs.length; i++) {
        const tag = await allInputs[i].evaluate(el => el.tagName);
        if (tag === 'TEXTAREA') {
          const visible = await allInputs[i].isVisible().catch(() => false);
          if (visible) {
            await allInputs[i].fill('请用中文回复以下问题：1. 你好世界 2. 招聘计划已完成 3. 筛选阶段开始');
            LOG('  Typed message in textarea[' + i + ']');
            break;
          }
        }
      }
    }
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'step5-message-typed.png' });

    // 6. Submit
    LOG('\n=== Step 6: Submit ===');
    const submitBtn = page.locator('button:has-text("Send"), button:has-text("Comment"), button:has-text("Reply"), button:has-text("回复")').first();
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click();
      LOG('  Clicked submit button');
    } else {
      await page.keyboard.press('Control+Enter');
      LOG('  Pressed Ctrl+Enter');
    }
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'step6-submitted.png' });

    // 7. Monitor 2 min
    LOG('\n=== Step 7: Monitor 2 min ===');
    for (let i = 0; i < 12; i++) {
      await sleep(10000);
      await page.reload();
      await page.waitForTimeout(2000);

      const text = await page.locator('body').textContent().catch(() => '') || '';
      const garbled = /[褰鈥睍]/.test(text);
      const chinese = /[\u4e00-\u9fff]/.test(text);

      LOG('[' + (i+1)*10 + 's] Chinese=' + chinese + ' Garbled=' + garbled);

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
          LOG('!!!! GARBLE IN MD[' + j + '] !!!!');
          LOG(md.substring(0, 300));
          await page.screenshot({ path: 'garbled-md.png', fullPage: true });
          break;
        }
        if (/[\u4e00-\u9fff]/.test(md) && md.length > 30) {
          LOG('  MD[' + j + '] Chinese: ' + md.substring(0, 100));
        }
      }
    }

    if (!/[褰鈥睍]/.test(await page.locator('body').textContent().catch(() => ''))) {
      LOG('\n=== FINAL: No garbled text ===');
    }
    
    await page.screenshot({ path: 'final.png', fullPage: true });
    LOG('\nDone!');
    
  } catch (e) {
    LOG('Error: ' + e.message);
    await page.screenshot({ path: 'error.png' });
  }

  await browser.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
