const { chromium } = require('@playwright/test');
const s = ms => new Promise(r => setTimeout(r, ms));
const LOG = msg => console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`);

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 150 });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  try {
    LOG('=== 1. Login ===');
    await page.goto('http://192.168.50.233:3100/auth');
    await page.waitForSelector('input[name="email"]', { timeout: 5000 });
    await page.locator('input[name="email"]').fill('datobig18@gmail.com');
    await page.locator('input[name="password"]').fill('666888abc');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.screenshot({ path: '1-login.png', fullPage: true });
    LOG('  Logged in!');

    LOG('\n=== 2. Onboarding ===');
    await page.goto('http://192.168.50.233:3100/onboarding');
    await s(2000);
    await page.screenshot({ path: '2-onboard.png', fullPage: true });

    const closeBtn = page.locator('button:has-text("Close")').first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
      await s(1000);
    }

    await page.locator('button:has-text("Start Onboarding")').first().click({ force: true });
    await s(1000);
    await page.screenshot({ path: '3-started.png', fullPage: true });
    LOG('  Started!');

    LOG('\n=== 3. Company ===');
    await page.locator('input').first().fill('NewCTOTest');
    await s(300);
    await page.screenshot({ path: '4-company.png', fullPage: true });
    await page.locator('button:has-text("Next")').first().click();
    await s(2000);
    await page.screenshot({ path: '5-next1.png', fullPage: true });
    LOG('  Company filled!');

    LOG('\n=== 4. CEO ===');
    const inputs = await page.locator('input').all();
    for (const inp of inputs) {
      if (await inp.isVisible().catch(() => false)) {
        await inp.fill('CEO');
        await s(300);
        break;
      }
    }
    await page.screenshot({ path: '6-ceo.png', fullPage: true });
    await page.locator('button:has-text("Next")').first().click();
    await s(2000);
    await page.screenshot({ path: '7-next2.png', fullPage: true });
    LOG('  CEO filled!');

    LOG('\n=== 5. Mission ===');
    await page.locator('button:has-text("Next")').first().click();
    await s(2000);
    await page.screenshot({ path: '8-mission.png', fullPage: true });

    LOG('\n=== 6. Task (中文) ===');
    const taskInputs = await page.locator('input').all();
    for (const inp of taskInputs) {
      if (await inp.isVisible().catch(() => false)) {
        await inp.fill('中文测试：请用纯中文回复，创建CTO招聘流程');
        await s(300);
        await page.screenshot({ path: '9-task.png', fullPage: true });
        LOG('  Task filled!');
        break;
      }
    }

    LOG('\n=== 7. Click Create & Open Issue ===');
    const createBtn = page.locator('button:has-text("Create & Open Issue")').first();
    if (await createBtn.isVisible().catch(() => false)) {
      await createBtn.click();
      await s(1000);
      await page.screenshot({ path: '10-create.png', fullPage: true });
      LOG('  Clicked!');
    }

    LOG('\n=== 8. Wait for redirect ===');
    for (let i = 0; i < 60; i++) {
      await s(5000);
      const url = page.url();
      LOG(`  [${(i+1)*5}s] ${url}`);
      await page.screenshot({ path: `wait-${(i+1)*5}s.png`, fullPage: true });
      if (!url.includes('/onboarding')) {
        LOG('  ✅ Redirected: ' + url);
        break;
      }
    }

    // Wait for CEO to want to hire CTO
    LOG('\n=== 9. Wait for CTO approval request ===');
    for (let i = 0; i < 60; i++) {
      await s(10000);
      await page.reload();
      await s(2000);
      
      const text = await page.locator('body').textContent().catch(() => '') || '';
      const garbled = /[褰鈥睍]/.test(text);
      const chinese = /[\u4e00-\u9fff]/.test(text);
      
      // Check for approval button
      const approveBtn = page.locator('button:has-text("Approve"), button:has-text("批准")').first();
      const hasApprove = await approveBtn.isVisible().catch(() => false);
      
      LOG(`[${(i+1)*10}s] Chinese=${chinese} Garbled=${garbled} Approve=${hasApprove}`);
      await page.screenshot({ path: `cto-${(i+1)*10}s.png`, fullPage: true });
      
      if (garbled) {
        LOG('\n!!!! GARBLE DETECTED !!!!!');
        await page.screenshot({ path: 'GARBLED.png', fullPage: true });
        break;
      }
      
      if (hasApprove) {
        LOG('  ✅ Found approval button!');
        await approveBtn.click();
        await s(3000);
        await page.screenshot({ path: '11-approved.png', fullPage: true });
        LOG('  Approved!');
        
        // Wait for CTO response
        LOG('\n=== 10. Monitor CTO response ===');
        for (let j = 0; j < 24; j++) {
          await s(10000);
          await page.reload();
          await s(2000);
          
          const text2 = await page.locator('body').textContent().catch(() => '') || '';
          const garbled2 = /[褰鈥睍]/.test(text2);
          const chinese2 = /[\u4e00-\u9fff]/.test(text2);
          
          LOG(`[${(j+1)*10}s] Chinese=${chinese2} Garbled=${garbled2}`);
          
          if (garbled2) {
            LOG('\n!!!! GARBLE IN CTO RESPONSE !!!!!');
            await page.screenshot({ path: 'GARBLED-CTO.png', fullPage: true });
            break;
          }
          
          const mds = await page.locator('.paperclip-markdown').allTextContents();
          for (let k = 0; k < mds.length; k++) {
            if (/[褰鈥睍]/.test(mds[k])) {
              LOG(`!!!! GARBLE IN MD[${k}] !!!!`);
              await page.screenshot({ path: 'GARBLED-MD.png', fullPage: true });
              break;
            }
            if (/[\u4e00-\u9fff]/.test(mds[k]) && mds[k].length > 30) {
              LOG(`  MD[${k}] Chinese: ${mds[k].substring(0, 100)}`);
            }
          }
        }
        break;
      }
    }

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
