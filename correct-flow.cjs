const { chromium } = require('@playwright/test');
const s = ms => new Promise(r => setTimeout(r, ms));
const LOG = msg => console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`);

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 150 });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  try {
    // 1. Login
    LOG('=== 1. Login ===');
    await page.goto('http://localhost:3100/auth');
    await page.waitForSelector('input[name="email"]', { timeout: 5000 });
    await page.locator('input[name="email"]').fill('datobig18@gmail.com');
    await page.locator('input[name="password"]').fill('666888abc');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.screenshot({ path: '1-login.png', fullPage: true });
    LOG('  Logged in!');

    // 2. Go to onboarding
    LOG('\n=== 2. Onboarding ===');
    await page.goto('http://localhost:3100/onboarding');
    await s(2000);
    await page.screenshot({ path: '2-onboarding.png', fullPage: true });

    // Close modal if open
    const closeBtn = page.locator('button:has-text("Close")').first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
      await s(1000);
    }

    // Click Start Onboarding
    await page.locator('button:has-text("Start Onboarding")').first().click({ force: true });
    await s(1000);
    await page.screenshot({ path: '3-started.png', fullPage: true });
    LOG('  Started!');

    // 3. Step 1: Company name
    LOG('\n=== 3. Step 1: Company ===');
    await page.locator('input').first().fill('UTF8Final');
    await s(300);
    await page.screenshot({ path: '4-company.png', fullPage: true });
    LOG('  Filled company');
    
    // Click Next
    await page.locator('button:has-text("Next")').first().click();
    await s(2000);
    await page.screenshot({ path: '5-next1.png', fullPage: true });
    LOG('  Next');

    // 4. Step 2: Agent name
    LOG('\n=== 4. Step 2: Agent ===');
    const inputs = await page.locator('input').all();
    for (const inp of inputs) {
      if (await inp.isVisible().catch(() => false)) {
        await inp.fill('CEO');
        await s(300);
        break;
      }
    }
    await page.screenshot({ path: '6-ceo.png', fullPage: true });
    LOG('  Filled CEO');
    
    // Click Next
    await page.locator('button:has-text("Next")').first().click();
    await s(2000);
    await page.screenshot({ path: '7-next2.png', fullPage: true });
    LOG('  Next');

    // 5. Step 3: Mission (optional)
    LOG('\n=== 5. Step 3: Mission ===');
    const ta = page.locator('textarea').first();
    if (await ta.isVisible().catch(() => false)) {
      await ta.fill('测试公司：请用中文进行所有沟通');
      await s(300);
      await page.screenshot({ path: '8-mission.png', fullPage: true });
      LOG('  Filled mission');
    }
    
    // Click Next
    await page.locator('button:has-text("Next")').first().click();
    await s(2000);
    await page.screenshot({ path: '9-next3.png', fullPage: true });
    LOG('  Next');

    // 6. Step 4: Task - Click "Create & Open Issue" (NOT Next!)
    LOG('\n=== 6. Step 4: Task ===');
    const taskInputs = await page.locator('input').all();
    for (const inp of taskInputs) {
      if (await inp.isVisible().catch(() => false)) {
        await inp.fill('中文测试：请用纯中文回复');
        await s(300);
        await page.screenshot({ path: '10-task.png', fullPage: true });
        LOG('  Filled task');
        break;
      }
    }
    
    // Click "Create & Open Issue" (NOT "Next"!)
    LOG('\n=== 7. Click Create & Open Issue ===');
    const createBtn = page.locator('button:has-text("Create & Open Issue")').first();
    if (await createBtn.isVisible().catch(() => false)) {
      await createBtn.click();
      await s(1000);
      await page.screenshot({ path: '11-clicked-create.png', fullPage: true });
      LOG('  Clicked Create & Open Issue!');
    } else {
      // Try "Launch" if not found
      const launchBtn = page.locator('button:has-text("Launch")').first();
      if (await launchBtn.isVisible().catch(() => false)) {
        await launchBtn.click();
        await s(1000);
        await page.screenshot({ path: '11-clicked-launch.png', fullPage: true });
        LOG('  Clicked Launch!');
      }
    }

    // 7. Wait for redirect to company page
    LOG('\n=== 8. Waiting for redirect ===');
    for (let i = 0; i < 60; i++) {
      await s(5000);
      const url = page.url();
      const creating = await page.locator('text=Creating').isVisible().catch(() => false);
      LOG(`  [${(i+1)*5}s] ${url} Creating=${creating}`);
      await page.screenshot({ path: `wait-${(i+1)*5}s.png`, fullPage: true });

      // Redirected away from onboarding = success
      if (!url.includes('/onboarding')) {
        LOG('  ✅ Redirected: ' + url);
        break;
      }
    }

    // 8. Monitor page for Chinese content
    LOG('\n=== 9. Monitor ===');
    for (let i = 0; i < 36; i++) {
      await s(10000);
      await page.reload();
      await s(2000);
      
      const text = await page.locator('body').textContent().catch(() => '') || '';
      const garbled = /[褰鈥睍]/.test(text);
      const chinese = /[\u4e00-\u9fff]/.test(text);
      
      LOG(`[${(i+1)*10}s] Chinese=${chinese} Garbled=${garbled} URL=${page.url()}`);
      
      if (garbled) {
        LOG('\n!!!! GARBLE DETECTED !!!!!');
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
    LOG('\nERROR: ' + e.message);
    await page.screenshot({ path: 'ERROR.png', fullPage: true });
    await new Promise(() => {});
  }
}

main();
