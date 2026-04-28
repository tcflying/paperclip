const { chromium } = require('@playwright/test');
const s = ms => new Promise(r => setTimeout(r, ms));
const LOG = msg => console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`);

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 150 });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  try {
    // Login
    LOG('=== 1. Login ===');
    await page.goto('http://localhost:3100/auth');
    await page.waitForSelector('input[name="email"]', { timeout: 5000 });
    await page.locator('input[name="email"]').fill('datobig18@gmail.com');
    await page.locator('input[name="password"]').fill('666888abc');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.screenshot({ path: '1-login.png', fullPage: true });
    LOG('  Logged in!');

    // Go to UTFAA company
    LOG('\n=== 2. Go to UTFAA issues ===');
    await page.goto('http://localhost:3100/UTFAA/issues');
    await s(3000);
    await page.screenshot({ path: '2-issues.png', fullPage: true });
    LOG('  URL: ' + page.url());

    // Click New Issue
    LOG('\n=== 3. Create issue ===');
    const newBtn = page.locator('button:has-text("New Issue")').first();
    if (await newBtn.isVisible().catch(() => false)) {
      await newBtn.click();
      await s(2000);
      await page.screenshot({ path: '3-form.png', fullPage: true });
      LOG('  Opened form');
    }

    // Fill title
    const titleIn = page.locator('input').first();
    if (await titleIn.isVisible().catch(() => false)) {
      await titleIn.fill('中文测试：请用纯中文回复');
      await s(300);
      await page.screenshot({ path: '4-title.png', fullPage: true });
      LOG('  Filled title');
    }

    // Fill body
    const ed = page.locator('[contenteditable="true"]').first();
    if (await ed.isVisible().catch(() => false)) {
      await ed.click();
      await page.keyboard.type('请用中文回复以下问题：\n1. 你好世界\n2. 招聘计划已完成\n3. 筛选阶段开始\n\n请用纯中文回复。');
      await s(300);
      await page.screenshot({ path: '5-body.png', fullPage: true });
      LOG('  Filled body');
    }

    // Submit
    const subBtn = page.locator('button:has-text("Submit"), button:has-text("Create")').first();
    if (await subBtn.isVisible().catch(() => false)) {
      await subBtn.click();
      await s(3000);
      await page.screenshot({ path: '6-submitted.png', fullPage: true });
      LOG('  Submitted!');
    }

    // Assign to CEO
    LOG('\n=== 4. Assign to CEO ===');
    const assignBtn = page.locator('button:has-text("Assign")').first();
    if (await assignBtn.isVisible().catch(() => false)) {
      await assignBtn.click();
      await s(500);
      const ceoBtn = page.locator('button:has-text("CEO")').first();
      if (await ceoBtn.isVisible().catch(() => false)) {
        await ceoBtn.click();
        await s(500);
        await page.screenshot({ path: '7-assigned.png', fullPage: true });
        LOG('  Assigned to CEO');
      }
    }

    // Send message
    LOG('\n=== 5. Send message ===');
    const ed2 = page.locator('[contenteditable="true"]').first();
    if (await ed2.isVisible().catch(() => false)) {
      await ed2.click();
      await page.keyboard.type('请用中文回复：你好世界、招聘计划已完成');
      await s(300);
      await page.screenshot({ path: '8-message.png', fullPage: true });
      LOG('  Typed message');
    }

    // Send
    const sendBtn = page.locator('button:has-text("Send")').first();
    if (await sendBtn.isVisible().catch(() => false)) {
      await sendBtn.click();
      await s(3000);
      await page.screenshot({ path: '9-sent.png', fullPage: true });
      LOG('  Sent!');
    }

    // Monitor
    LOG('\n=== 6. Monitor ===');
    for (let i = 0; i < 36; i++) {
      await s(10000);
      await page.reload();
      await s(2000);
      const text = await page.locator('body').textContent().catch(() => '') || '';
      const garbled = /[褰鈥睍]/.test(text);
      const chinese = /[\u4e00-\u9fff]/.test(text);
      LOG(`[${(i+1)*10}s] Chinese=${chinese} Garbled=${garbled}`);
      
      if (garbled) {
        LOG('\n!!!! GARBLE DETECTED !!!!');
        await page.screenshot({ path: 'GARBLED.png', fullPage: true });
        break;
      }

      const mds = await page.locator('.paperclip-markdown').allTextContents();
      for (let j = 0; j < mds.length; j++) {
        if (/[褰鈥睍]/.test(mds[j])) {
          LOG(`\n!!!! GARBLE IN MD[${j}] !!!!!`);
          await page.screenshot({ path: 'GARBLED-MD.png', fullPage: true });
          break;
        }
        if (/[\u4e00-\u9fff]/.test(mds[j]) && mds[j].length > 30) {
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
      LOG('\n✅ NO GARBLE - SUCCESS!');
    } else {
      LOG('\n❌ GARBLE DETECTED - FAILED!');
    }

    LOG('\nBrowser kept open for inspection.');
    await new Promise(() => {});

  } catch (e) {
    LOG('\nERROR: ' + e.message);
    await page.screenshot({ path: 'ERROR.png', fullPage: true });
    await new Promise(() => {});
  }
}

main();
