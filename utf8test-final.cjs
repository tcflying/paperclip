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
    await page.waitForSelector('input[name="email"]', { timeout: 8000 });
    await page.locator('input[name="email"]').fill('datobig18@gmail.com');
    await page.locator('input[name="password"]').fill('666888abc');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    LOG('  Logged in!');

    // Go to onboarding
    LOG('\n=== 2. Go to onboarding ===');
    await page.goto('http://localhost:3100/onboarding');
    await s(2000);
    await page.screenshot({ path: '1-onboard.png', fullPage: true });

    // Close any open modal first
    LOG('\n=== 3. Close modal if open ===');
    const closeBtn = page.locator('button:has-text("Close")').first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
      await s(1000);
      await page.screenshot({ path: '2-closed.png', fullPage: true });
      LOG('  Closed modal');
    }

    // Click "Start Onboarding"
    LOG('\n=== 4. Click Start Onboarding ===');
    const startBtn = page.locator('button:has-text("Start Onboarding")').first();
    await startBtn.click({ force: true });
    await s(1000);
    await page.screenshot({ path: '3-started.png', fullPage: true });
    LOG('  Clicked Start Onboarding');

    // Fill Step 1: Company name
    LOG('\n=== 5. Fill company name ===');
    await page.locator('input').first().fill('UTF8Test');
    await s(300);
    await page.screenshot({ path: '4-name.png', fullPage: true });
    LOG('  Filled: UTF8Test');

    // Next
    await page.locator('button:has-text("Next")').first().click();
    await s(2000);
    await page.screenshot({ path: '5-next1.png', fullPage: true });
    LOG('  Next');

    // Step 2: Mission
    const missionTa = page.locator('textarea').first();
    if (await missionTa.isVisible().catch(() => false)) {
      await missionTa.fill('测试：请用中文进行沟通');
      await s(300);
    }

    await page.locator('button:has-text("Next")').first().click();
    await s(2000);
    await page.screenshot({ path: '6-next2.png', fullPage: true });
    LOG('  Next');

    // Step 3: CEO name
    LOG('\n=== 6. Fill CEO ===');
    const inputs = await page.locator('input').all();
    for (const inp of inputs) {
      const visible = await inp.isVisible().catch(() => false);
      if (visible) {
        await inp.fill('CEO');
        await s(300);
        break;
      }
    }
    await page.screenshot({ path: '7-ceo.png', fullPage: true });
    LOG('  Filled CEO');

    await page.locator('button:has-text("Next")').first().click();
    await s(2000);
    await page.screenshot({ path: '8-next3.png', fullPage: true });

    // Step 4: Task
    LOG('\n=== 7. Fill task ===');
    const taskInputs = await page.locator('input').all();
    for (const inp of taskInputs) {
      const visible = await inp.isVisible().catch(() => false);
      if (visible) {
        await inp.fill('中文测试：请用纯中文回复');
        await s(300);
        break;
      }
    }
    await page.screenshot({ path: '9-task.png', fullPage: true });

    // Launch
    LOG('\n=== 8. Launch ===');
    await page.locator('button:has-text("Launch")').first().click();
    await s(1000);
    await page.screenshot({ path: '10-launched.png', fullPage: true });
    LOG('  Launched!');

    // Wait for onboarding to complete
    LOG('\n=== 9. Wait for onboarding ===');
    let redirectCount = 0;
    for (let i = 0; i < 60; i++) {
      await s(5000);
      const url = page.url();
      const creating = await page.locator('text=Creating').isVisible().catch(() => false);
      LOG(`  [${(i+1)*5}s] ${url} Creating=${creating}`);
      await page.screenshot({ path: `wait-${(i+1)*5}s.png`, fullPage: true });

      if (!url.includes('/onboarding')) {
        LOG('  Redirected: ' + url);
        break;
      }
    }

    await page.screenshot({ path: '11-after-onboard.png', fullPage: true });
    LOG('  URL: ' + page.url());

    // Check companies
    LOG('\n=== 10. Check companies ===');
    const companies = await page.evaluate(async () => {
      const res = await fetch('/api/companies', { credentials: 'include' });
      const data = await res.json();
      return data.filter(c => c.status === 'active').map(c => ({ name: c.name, prefix: c.issuePrefix }));
    });
    LOG('  Active: ' + companies.length);
    for (const c of companies) LOG('    - ' + c.name + ' (' + c.prefix + ')');

    if (companies.length > 0) {
      const p = companies[0].prefix;
      await page.goto('http://localhost:3100/' + p + '/issues');
      await s(3000);
      await page.screenshot({ path: '12-issues.png', fullPage: true });

      // New Issue
      const newBtn = page.locator('button:has-text("New Issue")').first();
      if (await newBtn.isVisible().catch(() => false)) {
        await newBtn.click();
        await s(2000);
        await page.screenshot({ path: '13-new-form.png', fullPage: true });
      }

      // Title
      const titleIn = page.locator('input').first();
      if (await titleIn.isVisible().catch(() => false)) {
        await titleIn.fill('中文测试：请用纯中文回复');
        await s(300);
      }

      // Body
      const ed = page.locator('[contenteditable="true"]').first();
      if (await ed.isVisible().catch(() => false)) {
        await ed.click();
        await page.keyboard.type('请用中文回复：1. 你好世界 2. 招聘完成 3. 筛选开始');
        await s(300);
        await page.screenshot({ path: '14-body.png', fullPage: true });
      }

      // Submit
      const subBtn = page.locator('button:has-text("Submit"), button:has-text("Create")').first();
      if (await subBtn.isVisible().catch(() => false)) {
        await subBtn.click();
        await s(3000);
        await page.screenshot({ path: '15-submitted.png', fullPage: true });
      }

      // Assign
      const assignBtn = page.locator('button:has-text("Assign")').first();
      if (await assignBtn.isVisible().catch(() => false)) {
        await assignBtn.click();
        await s(500);
        const ceoBtn = page.locator('button:has-text("CEO")').first();
        if (await ceoBtn.isVisible().catch(() => false)) {
          await ceoBtn.click();
          await s(500);
          await page.screenshot({ path: '16-assigned.png', fullPage: true });
        }
      }

      // Message
      const ed2 = page.locator('[contenteditable="true"]').first();
      if (await ed2.isVisible().catch(() => false)) {
        await ed2.click();
        await page.keyboard.type('请用中文回复');
        await s(300);
      }

      const sendBtn = page.locator('button:has-text("Send")').first();
      if (await sendBtn.isVisible().catch(() => false)) {
        await sendBtn.click();
        await s(3000);
        await page.screenshot({ path: '17-sent.png', fullPage: true });
      }

      // Monitor
      LOG('\n=== 11. Monitor ===');
      for (let i = 0; i < 36; i++) {
        await s(10000);
        await page.reload();
        await s(2000);
        const text = await page.locator('body').textContent().catch(() => '') || '';
        const garbled = /[褰鈥睍]/.test(text);
        const chinese = /[\u4e00-\u9fff]/.test(text);
        LOG(`[${(i+1)*10}s] Chinese=${chinese} Garbled=${garbled}`);
        if (garbled) {
          LOG('\n!!!! GARBLE !!!!!');
          await page.screenshot({ path: 'GARBLED.png', fullPage: true });
          break;
        }
        const mds = await page.locator('.paperclip-markdown').allTextContents();
        for (let j = 0; j < mds.length; j++) {
          if (/[褰鈥睍]/.test(mds[j])) {
            LOG(`!!!! GARBLE IN MD[${j}] !!!!`);
            await page.screenshot({ path: 'GARBLED-MD.png', fullPage: true });
            break;
          }
        }
      }
    }

    LOG('\n=== FINAL ===');
    await page.screenshot({ path: 'FINAL.png', fullPage: true });
    const finalText = await page.locator('body').textContent().catch(() => '') || '';
    const finalGarbled = /[褰鈥睍]/.test(finalText);
    const finalChinese = /[\u4e00-\u9fff]/.test(finalText);
    LOG(`Garbled=${finalGarbled} Chinese=${finalChinese}`);

    if (!finalGarbled) {
      LOG('\n✅ NO GARBLE');
    } else {
      LOG('\n❌ GARBLE DETECTED');
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
