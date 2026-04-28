const { chromium } = require('@playwright/test');
const s = ms => new Promise(r => setTimeout(r, ms));
const LOG = msg => console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`);

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 150 });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  try {
    // Step 1: Login
    LOG('=== Step 1: Login ===');
    await page.goto('http://localhost:3100/auth');
    await page.waitForSelector('input[name="email"]', { timeout: 8000 });
    await page.locator('input[name="email"]').fill('datobig18@gmail.com');
    await page.locator('input[name="password"]').fill('666888abc');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.screenshot({ path: 'step1-loggedin.png', fullPage: true });
    LOG('  Logged in!');

    // Step 2: Navigate to onboarding
    LOG('\n=== Step 2: Go to onboarding ===');
    await page.goto('http://localhost:3100/onboarding');
    await s(2000);
    await page.screenshot({ path: 'step2-onboarding.png', fullPage: true });
    LOG('  On onboarding page, URL: ' + page.url());

    // Step 3: Fill company name
    LOG('\n=== Step 3: Fill company name ===');
    const nameInput = page.locator('input[placeholder*="Acme"], input[placeholder*="Company"]').first();
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill('');
      await nameInput.fill('UTF8Test');
      await s(300);
      LOG('  Filled company name: UTF8Test');
    } else {
      // Try finding the input differently
      const allInputs = await page.locator('input').all();
      for (const inp of allInputs) {
        const ph = await inp.getAttribute('placeholder').catch(() => '');
        const visible = await inp.isVisible().catch(() => false);
        if (visible) {
          LOG('  Input placeholder: ' + ph);
        }
      }
      // Click first visible input
      if (allInputs.length > 0) {
        const first = allInputs[0];
        const visible = await first.isVisible().catch(() => false);
        if (visible) {
          await first.fill('UTF8Test');
          LOG('  Filled first visible input with UTF8Test');
        }
      }
    }
    await page.screenshot({ path: 'step3-name.png', fullPage: true });

    // Step 4: Fill mission/description
    LOG('\n=== Step 4: Fill mission ===');
    const textareas = await page.locator('textarea').all();
    for (const ta of textareas) {
      const visible = await ta.isVisible().catch(() => false);
      if (visible) {
        await ta.fill('测试公司：请用中文进行所有沟通和回复');
        LOG('  Filled textarea with Chinese mission');
        break;
      }
    }
    await page.screenshot({ path: 'step4-mission.png', fullPage: true });

    // Step 5: Click Next
    LOG('\n=== Step 5: Click Next ===');
    const nextBtns = await page.locator('button').all();
    for (const btn of nextBtns) {
      const text = await btn.textContent().catch(() => '');
      const visible = await btn.isVisible().catch(() => false);
      if (visible && (text.includes('Next') || text.includes('Continue'))) {
        await btn.click();
        LOG('  Clicked: ' + text.trim());
        break;
      }
    }
    await s(2000);
    await page.screenshot({ path: 'step5-after-next.png', fullPage: true });
    LOG('  URL: ' + page.url());

    // Step 6: Fill CEO agent name
    LOG('\n=== Step 6: Fill CEO name ===');
    const ceoInputs = await page.locator('input').all();
    for (const inp of ceoInputs) {
      const ph = await inp.getAttribute('placeholder').catch(() => '');
      const visible = await inp.isVisible().catch(() => false);
      if (visible && (ph.includes('CEO') || ph.includes('Agent') || ph.includes('name'))) {
        await inp.fill('CEO');
        LOG('  Filled CEO name, placeholder: ' + ph);
        break;
      }
    }
    await s(300);
    await page.screenshot({ path: 'step6-ceo.png', fullPage: true });

    // Step 7: Click Next again
    LOG('\n=== Step 7: Click Next for agent ===');
    const nextBtns2 = await page.locator('button').all();
    for (const btn of nextBtns2) {
      const text = await btn.textContent().catch(() => '');
      const visible = await btn.isVisible().catch(() => false);
      if (visible && (text.includes('Next') || text.includes('Continue'))) {
        await btn.click();
        LOG('  Clicked: ' + text.trim());
        break;
      }
    }
    await s(2000);
    await page.screenshot({ path: 'step7-agent-next.png', fullPage: true });
    LOG('  URL: ' + page.url());

    // Step 8: Fill task description
    LOG('\n=== Step 8: Fill task description ===');
    const taskInputs = await page.locator('input').all();
    for (const inp of taskInputs) {
      const ph = await inp.getAttribute('placeholder').catch(() => '');
      const visible = await inp.isVisible().catch(() => false);
      if (visible) {
        LOG('  Input placeholder: ' + ph);
      }
    }
    // Fill first visible input with Chinese task
    for (const inp of taskInputs) {
      const visible = await inp.isVisible().catch(() => false);
      if (visible) {
        await inp.fill('中文测试：请用纯中文回复所有问题');
        LOG('  Filled task with Chinese');
        break;
      }
    }
    await s(300);
    await page.screenshot({ path: 'step8-task.png', fullPage: true });

    // Step 9: Click Launch / Submit
    LOG('\n=== Step 9: Launch ===');
    const launchBtns = await page.locator('button').all();
    for (const btn of launchBtns) {
      const text = await btn.textContent().catch(() => '');
      const visible = await btn.isVisible().catch(() => false);
      if (visible && (text.includes('Launch') || text.includes('Submit') || text.includes('Create'))) {
        await btn.click();
        LOG('  Clicked: ' + text.trim());
        break;
      }
    }
    await s(2000);
    await page.screenshot({ path: 'step9-launched.png', fullPage: true });
    LOG('  URL after launch: ' + page.url());

    // Step 10: Wait for onboarding to complete (watch for redirect)
    LOG('\n=== Step 10: Wait for onboarding completion ===');
    let redirectCount = 0;
    for (let i = 0; i < 60; i++) { // Max 5 min
      await s(5000);
      const url = page.url();
      const creating = await page.locator('text=Creating').isVisible().catch(() => false);
      
      LOG(`  [${(i+1)*5}s] URL: ${url} Creating=${creating}`);
      await page.screenshot({ path: `onboarding-wait-${(i+1)*5}s.png` });

      if (!url.includes('/onboarding')) {
        LOG('  Onboarding completed! Redirected to: ' + url);
        break;
      }
      redirectCount++;
    }

    await s(3000);
    await page.screenshot({ path: 'step10-after-onboarding.png', fullPage: true });
    LOG('  Final URL: ' + page.url());

    // Step 11: Navigate to the new company's issues
    LOG('\n=== Step 11: Go to issues ===');
    // Find the company prefix from URL or navigate to issues
    const currentUrl = page.url();
    let companyPrefix = '';
    if (currentUrl.includes('/issues')) {
      companyPrefix = currentUrl.split('/')[3];
      LOG('  Extracted prefix from URL: ' + companyPrefix);
    } else if (currentUrl.includes('/dashboard')) {
      companyPrefix = currentUrl.split('/')[3];
    }
    
    // Try to navigate to issues
    await page.goto(currentUrl.split('/dashboard')[0] + '/issues');
    await s(3000);
    await page.screenshot({ path: 'step11-issues.png', fullPage: true });
    LOG('  On issues page: ' + page.url());

    // Step 12: Find and click to create new issue
    LOG('\n=== Step 12: Create new issue ===');
    const newIssueBtn = page.locator('button:has-text("New Issue"), a:has-text("New Issue")').first();
    if (await newIssueBtn.isVisible().catch(() => false)) {
      await newIssueBtn.click();
      await s(2000);
      await page.screenshot({ path: 'step12-new-issue-form.png', fullPage: true });
      LOG('  Opened new issue form');
    }

    // Fill issue title and body
    LOG('\n=== Step 13: Fill issue ===');
    const issueTitleInput = page.locator('input[name="title"], input[placeholder*="Title"]').first();
    if (await issueTitleInput.isVisible().catch(() => false)) {
      await issueTitleInput.fill('中文编码测试：请用纯中文回复');
      LOG('  Filled issue title');
    }

    const issueBodyInput = page.locator('textarea[name="body"], [contenteditable="true"]').first();
    if (await issueBodyInput.isVisible().catch(() => false)) {
      await issueBodyInput.fill('请用中文回复以下问题：\n1. 你好世界\n2. 招聘计划已完成\n3. 筛选阶段开始\n\n请用纯中文回复，不要用英文。');
      LOG('  Filled issue body with Chinese');
    } else {
      // Try contenteditable
      const editors = await page.locator('[contenteditable="true"]').all();
      for (const ed of editors) {
        const visible = await ed.isVisible().catch(() => false);
        if (visible) {
          await ed.click();
          await page.keyboard.type('请用中文回复以下问题：\n1. 你好世界\n2. 招聘计划已完成\n3. 筛选阶段开始\n\n请用纯中文回复，不要用英文。');
          LOG('  Typed in contenteditable editor');
          break;
        }
      }
    }
    await s(500);
    await page.screenshot({ path: 'step13-issue-filled.png', fullPage: true });

    // Step 14: Submit issue
    LOG('\n=== Step 14: Submit issue ===');
    const submitBtns = await page.locator('button').all();
    for (const btn of submitBtns) {
      const text = await btn.textContent().catch(() => '');
      const visible = await btn.isVisible().catch(() => false);
      if (visible && (text.includes('Submit') || text.includes('Create') || text.includes('Save'))) {
        await btn.click();
        LOG('  Clicked: ' + text.trim());
        break;
      }
    }
    await s(3000);
    await page.screenshot({ path: 'step14-issue-submitted.png', fullPage: true });
    LOG('  URL: ' + page.url());

    // Step 15: Assign to CEO
    LOG('\n=== Step 15: Assign to CEO ===');
    const assigneeBtns = await page.locator('button:has-text("Assign"), button:has-text("Unassigned")').all();
    for (const btn of assigneeBtns) {
      const visible = await btn.isVisible().catch(() => false);
      if (visible) {
        await btn.click();
        await s(500);
        await page.screenshot({ path: 'step15-dropdown.png' });
        LOG('  Clicked assignee');
        
        // Now select CEO
        const ceoOpts = await page.locator('button:has-text("CEO")').all();
        for (const ceo of ceoOpts) {
          const visible2 = await ceo.isVisible().catch(() => false);
          if (visible2) {
            await ceo.click();
            LOG('  Selected CEO');
            break;
          }
        }
        break;
      }
    }
    await s(1000);
    await page.screenshot({ path: 'step15-assigned.png', fullPage: true });

    // Step 16: Send message
    LOG('\n=== Step 16: Send message ===');
    const editors2 = await page.locator('.paperclip-mdxeditor-content, [contenteditable="true"]').all();
    for (const ed of editors2) {
      const visible = await ed.isVisible().catch(() => false);
      if (visible) {
        await ed.click();
        await page.keyboard.type('请用中文回复：你好世界、招聘计划已完成');
        LOG('  Typed message in editor');
        break;
      }
    }
    await s(500);
    await page.screenshot({ path: 'step16-message-typed.png' });

    // Step 17: Send
    LOG('\n=== Step 17: Send ===');
    const sendBtns = await page.locator('button:has-text("Send")').all();
    for (const btn of sendBtns) {
      const visible = await btn.isVisible().catch(() => false);
      const disabled = await btn.isDisabled().catch(() => true);
      if (visible && !disabled) {
        await btn.click();
        LOG('  Clicked Send');
        break;
      }
    }
    await s(3000);
    await page.screenshot({ path: 'step17-sent.png', fullPage: true });

    // Step 18: Monitor until Agent responds
    LOG('\n=== Step 18: Monitor for Agent response ===');
    let agentResponded = false;
    for (let i = 0; i < 36; i++) { // 6 min max
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

      // Check markdown blocks
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
          // If we see Chinese in markdown and it's been a while, agent might have responded
          if ((i+1)*10 > 30 && !agentResponded) {
            agentResponded = true;
            LOG('  Agent appears to have responded!');
          }
        }
      }

      // If we have Chinese content and no garbled, and agent has responded, we're good
      if (chinese && !garbled && agentResponded) {
        LOG('  Agent response confirmed with Chinese content, no garbled!');
        break;
      }
    }

    // Final state
    LOG('\n=== Final State ===');
    const finalText = await page.locator('body').textContent().catch(() => '') || '';
    const finalGarbled = /[褰鈥睍]/.test(finalText);
    const finalChinese = /[\u4e00-\u9fff]/.test(finalText);
    
    LOG(`Final: Chinese=${finalChinese} Garbled=${finalGarbled}`);
    
    await page.screenshot({ path: 'FINAL-STATE.png', fullPage: true });
    
    if (!finalGarbled && finalChinese) {
      LOG('\n✅ SUCCESS: Chinese content rendered correctly with no garbled text!');
    } else if (!finalGarbled) {
      LOG('\n⚠️ No garbled text detected, but no Chinese content yet');
    } else {
      LOG('\n❌ FAILURE: Garbled text detected!');
    }

    LOG('\n=== KEEPING BROWSER OPEN FOR INSPECTION ===');
    LOG('Browser will remain open. Press Ctrl+C to exit.');
    
    // Keep browser open
    await new Promise(() => {});

  } catch (e) {
    LOG('\n!!! ERROR !!!');
    LOG(e.message);
    await page.screenshot({ path: 'ERROR.png', fullPage: true });
    LOG('\nKeeping browser open for inspection...');
    await new Promise(() => {});
  }
}

main();
