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
    await page.screenshot({ path: '1-login.png', fullPage: true });
    LOG('  Logged in!');

    // Go to onboarding
    LOG('\n=== 2. Go to onboarding ===');
    await page.goto('http://localhost:3100/onboarding');
    await s(2000);
    await page.screenshot({ path: '2-onboarding.png', fullPage: true });
    LOG('  On onboarding page');

    // Click "Start Onboarding" if visible
    const startBtn = page.locator('button:has-text("Start Onboarding")').first();
    if (await startBtn.isVisible().catch(() => false)) {
      await startBtn.click();
      await s(1000);
      await page.screenshot({ path: '3-started.png', fullPage: true });
      LOG('  Clicked Start Onboarding');
    }

    // Step 1: Company name
    LOG('\n=== 3. Fill company name ===');
    const nameInput = page.locator('input').first();
    await nameInput.fill('UTF8Test');
    await s(300);
    await page.screenshot({ path: '4-name.png', fullPage: true });
    LOG('  Filled: UTF8Test');

    // Click Next
    LOG('\n=== 4. Click Next ===');
    await page.locator('button:has-text("Next")').first().click();
    await s(2000);
    await page.screenshot({ path: '5-next1.png', fullPage: true });
    LOG('  Next clicked');

    // Step 2: Mission (optional)
    LOG('\n=== 5. Fill mission ===');
    const missionInput = page.locator('textarea').first();
    if (await missionInput.isVisible().catch(() => false)) {
      await missionInput.fill('测试公司：请用中文进行所有沟通');
      await s(300);
      await page.screenshot({ path: '6-mission.png', fullPage: true });
      LOG('  Filled mission');
    }

    // Click Next
    await page.locator('button:has-text("Next")').first().click();
    await s(2000);
    await page.screenshot({ path: '7-next2.png', fullPage: true });
    LOG('  Next clicked');

    // Step 3: Agent name
    LOG('\n=== 6. Fill CEO name ===');
    const agentInputs = await page.locator('input').all();
    for (const inp of agentInputs) {
      const visible = await inp.isVisible().catch(() => false);
      if (visible) {
        await inp.fill('CEO');
        await s(300);
        await page.screenshot({ path: '8-ceo.png', fullPage: true });
        LOG('  Filled CEO name');
        break;
      }
    }

    // Click Next
    await page.locator('button:has-text("Next")').first().click();
    await s(2000);
    await page.screenshot({ path: '9-next3.png', fullPage: true });
    LOG('  Next clicked');

    // Step 4: Task description
    LOG('\n=== 7. Fill task ===');
    const taskInputs = await page.locator('input').all();
    for (const inp of taskInputs) {
      const visible = await inp.isVisible().catch(() => false);
      if (visible) {
        await inp.fill('中文测试：请用纯中文回复');
        await s(300);
        await page.screenshot({ path: '10-task.png', fullPage: true });
        LOG('  Filled task');
        break;
      }
    }

    // Click Launch
    LOG('\n=== 8. Launch ===');
    await page.locator('button:has-text("Launch")').first().click();
    await s(1000);
    await page.screenshot({ path: '11-launched.png', fullPage: true });
    LOG('  Launch clicked');

    // Wait for "Creating..." to appear then disappear
    LOG('\n=== 9. Wait for onboarding ===');
    let creatingSeen = false;
    for (let i = 0; i < 60; i++) {
      await s(5000);
      const url = page.url();
      const creating = await page.locator('text=Creating').isVisible().catch(() => false);
      const done = await page.locator('text=Done').isVisible().catch(() => false);
      
      if (creating) creatingSeen = true;
      
      LOG(`  [${(i+1)*5}s] URL: ${url} Creating=${creating} Done=${done}`);
      await page.screenshot({ path: `onboard-${(i+1)*5}s.png`, fullPage: true });

      // Check if redirected away from onboarding
      if (!url.includes('/onboarding')) {
        LOG('  Redirected to: ' + url);
        break;
      }
      
      // If creating was seen and now gone, onboarding might be stuck
      if (creatingSeen && !creating && i > 10) {
        LOG('  Creating text gone, checking page state...');
        const text = await page.locator('body').textContent().catch(() => '');
        if (text.includes('Create another company')) {
          LOG('  Onboarding was reset!');
          break;
        }
      }
    }

    await page.screenshot({ path: '12-after-onboard.png', fullPage: true });
    LOG('  Final URL: ' + page.url());

    // If still on onboarding, refresh and check
    if (page.url().includes('/onboarding')) {
      await page.reload();
      await s(3000);
      await page.screenshot({ path: '13-reload.png', fullPage: true });
      LOG('  After reload: ' + page.url());
    }

    // Check for active companies
    LOG('\n=== 10. Check companies ===');
    const companies = await page.evaluate(async () => {
      const res = await fetch('/api/companies', { credentials: 'include' });
      const data = await res.json();
      return data.filter(c => c.status === 'active').map(c => ({ name: c.name, prefix: c.issuePrefix, id: c.id }));
    });
    LOG('  Active companies: ' + companies.length);
    for (const c of companies) {
      LOG('    - ' + c.name + ' (' + c.prefix + ')');
    }

    if (companies.length > 0) {
      // Navigate to the new company's issues
      const company = companies[0];
      LOG('\n=== 11. Go to issues ===');
      await page.goto('http://localhost:3100/' + company.prefix + '/issues');
      await s(3000);
      await page.screenshot({ path: '14-issues.png', fullPage: true });
      LOG('  On issues: ' + page.url());

      // Click New Issue
      LOG('\n=== 12. Create issue ===');
      const newIssueBtn = page.locator('button:has-text("New Issue")').first();
      if (await newIssueBtn.isVisible().catch(() => false)) {
        await newIssueBtn.click();
        await s(2000);
        await page.screenshot({ path: '15-new-issue.png', fullPage: true });
        LOG('  Opened new issue form');
      }

      // Fill issue
      const titleInput = page.locator('input[name="title"], input[placeholder*="title" i]').first();
      if (await titleInput.isVisible().catch(() => false)) {
        await titleInput.fill('中文编码测试：请用纯中文回复');
        await s(300);
        LOG('  Filled title');
      }

      // Fill body in contenteditable
      const editors = await page.locator('[contenteditable="true"]').all();
      for (const ed of editors) {
        const visible = await ed.isVisible().catch(() => false);
        if (visible) {
          await ed.click();
          await page.keyboard.type('请用中文回复以下问题：\n1. 你好世界\n2. 招聘计划已完成\n3. 筛选阶段开始\n\n请用纯中文回复。');
          await s(300);
          await page.screenshot({ path: '16-body.png', fullPage: true });
          LOG('  Filled body');
          break;
        }
      }

      // Submit
      const submitBtn = page.locator('button:has-text("Submit"), button:has-text("Create")').first();
      if (await submitBtn.isVisible().catch(() => false)) {
        await submitBtn.click();
        await s(3000);
        await page.screenshot({ path: '17-submitted.png', fullPage: true });
        LOG('  Submitted issue');
      }

      // Assign to CEO
      LOG('\n=== 13. Assign to CEO ===');
      const assignBtn = page.locator('button:has-text("Assign")').first();
      if (await assignBtn.isVisible().catch(() => false)) {
        await assignBtn.click();
        await s(500);
        const ceoBtn = page.locator('button:has-text("CEO")').first();
        if (await ceoBtn.isVisible().catch(() => false)) {
          await ceoBtn.click();
          await s(500);
          await page.screenshot({ path: '18-assigned.png', fullPage: true });
          LOG('  Assigned to CEO');
        }
      }

      // Send message
      LOG('\n=== 14. Send message ===');
      const editors2 = await page.locator('[contenteditable="true"]').all();
      for (const ed of editors2) {
        const visible = await ed.isVisible().catch(() => false);
        if (visible) {
          await ed.click();
          await page.keyboard.type('请用中文回复：你好世界、招聘计划已完成');
          await s(300);
          await page.screenshot({ path: '19-message.png', fullPage: true });
          LOG('  Typed message');
          break;
        }
      }

      // Send
      const sendBtn = page.locator('button:has-text("Send")').first();
      if (await sendBtn.isVisible().catch(() => false)) {
        await sendBtn.click();
        await s(3000);
        await page.screenshot({ path: '20-sent.png', fullPage: true });
        LOG('  Sent!');
      }

      // Monitor
      LOG('\n=== 15. Monitor for Agent response ===');
      for (let i = 0; i < 36; i++) {
        await s(10000);
        await page.reload();
        await s(2000);
        
        const text = await page.locator('body').textContent().catch(() => '') || '';
        const garbled = /[褰鈥睍]/.test(text);
        const chinese = /[\u4e00-\u9fff]/.test(text);
        LOG(`[${(i+1)*10}s] Chinese=${chinese} Garbled=${garbled}`);
        
        if (garbled) {
          LOG('\n!!!! GARBLE DETECTED !!!!!');
          await page.screenshot({ path: 'GARBLED.png', fullPage: true });
          LOG(text.substring(0, 500));
          break;
        }

        const mds = await page.locator('.paperclip-markdown').allTextContents();
        for (let j = 0; j < mds.length; j++) {
          const md = mds[j];
          if (/[褰鈥睍]/.test(md)) {
            LOG(`\n!!!! GARBLE IN MD[${j}] !!!!!`);
            await page.screenshot({ path: 'GARBLED-MD.png', fullPage: true });
            LOG(md.substring(0, 300));
            break;
          }
          if (/[\u4e00-\u9fff]/.test(md) && md.length > 50) {
            LOG(`  MD[${j}] Chinese: ${md.substring(0, 100)}`);
          }
        }

        if (chinese && !garbled && i > 3) {
          LOG('  Chinese content found, no garbled!');
        }
      }
    }

    // Final check
    LOG('\n=== FINAL ===');
    await page.screenshot({ path: 'FINAL.png', fullPage: true });
    const finalText = await page.locator('body').textContent().catch(() => '') || '';
    const finalGarbled = /[褰鈥睍]/.test(finalText);
    const finalChinese = /[\u4e00-\u9fff]/.test(finalText);
    LOG(`Garbled=${finalGarbled} Chinese=${finalChinese}`);

    if (!finalGarbled) {
      LOG('\n✅ NO GARBLE - Test passed!');
    } else {
      LOG('\n❌ GARBLE DETECTED - Test failed!');
    }

    LOG('\n=== BROWSER KEPT OPEN ===');
    LOG('Press Ctrl+C to exit when done inspecting.');

    // Keep browser open
    await new Promise(() => {});

  } catch (e) {
    LOG('\n!!! ERROR !!!');
    LOG(e.message);
    await page.screenshot({ path: 'ERROR.png', fullPage: true });
    await new Promise(() => {});
  }
}

main();
