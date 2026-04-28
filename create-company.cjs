const { chromium } = require('@playwright/test');
const s = ms => new Promise(r => setTimeout(r, ms));
const LOG = msg => console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`);

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 150 });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  try {
    // Login
    await page.goto('http://192.168.50.233:3100/auth');
    await page.waitForSelector('input[name="email"]', { timeout: 8000 });
    await page.locator('input[name="email"]').fill('datobig18@gmail.com');
    await page.locator('input[name="password"]').fill('666888abc');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    LOG('Logged in');

    // Go to onboarding
    await page.goto('http://192.168.50.233:3100/onboarding');
    await s(2000);
    await page.screenshot({ path: '1-onboarding.png' });
    LOG('On onboarding page');

    // Step 1: Company name
    LOG('Step 1: Company name');
    const nameInput = page.locator('input[placeholder="Acme Corp"]');
    await nameInput.click();
    await nameInput.fill('');
    await page.keyboard.type('NewTest');
    await s(300);
    LOG('Typed company name');

    // Mission
    const missionInput = page.locator('textarea').first();
    if (await missionInput.isVisible().catch(() => false)) {
      await missionInput.click();
      await missionInput.fill('');
      await page.keyboard.type('测试：创建公司并让CEO用中文回复');
      await s(300);
      LOG('Typed mission');
    }

    // Click Next
    const nextBtn = page.locator('button', { hasText: 'Next' }).first();
    if (await nextBtn.isVisible().catch(() => false)) {
      await nextBtn.click();
      await s(2000);
      await page.screenshot({ path: '2-after-next.png' });
      LOG('Clicked Next');
    }

    // Step 2: Agent name
    LOG('Step 2: Agent');
    const agentInput = page.locator('input[placeholder*="CEO"]').first();
    await agentInput.click();
    await agentInput.fill('');
    await page.keyboard.type('CEO');
    await s(300);
    LOG('Typed CEO name');

    const nextBtn2 = page.locator('button', { hasText: 'Next' }).first();
    if (await nextBtn2.isVisible().catch(() => false)) {
      await nextBtn2.click();
      await s(2000);
      await page.screenshot({ path: '3-after-agent.png' });
      LOG('Clicked Next for agent');
    }

    // Step 3: Task
    LOG('Step 3: Task');
    const taskInputs = await page.locator('input:visible').all();
    LOG('  Visible inputs: ' + taskInputs.length);
    for (let i = 0; i < taskInputs.length; i++) {
      const ph = await taskInputs[i].getAttribute('placeholder');
      LOG('  Input[' + i + ']: "' + ph + '"');
    }

    if (taskInputs.length > 0) {
      await taskInputs[0].click();
      await taskInputs[0].fill('');
      await page.keyboard.type('中文测试：请用中文回复');
      await s(300);
      LOG('Typed task title');
    }

    // Launch
    LOG('Step 4: Launch');
    const launchBtn = page.locator('button', { hasText: 'Launch' }).first();
    if (await launchBtn.isVisible().catch(() => false)) {
      await launchBtn.click();
      LOG('Clicked Launch');
    } else {
      const submitBtn = page.locator('button', { hasText: 'Submit' }).first();
      if (await submitBtn.isVisible().catch(() => false)) {
        await submitBtn.click();
        LOG('Clicked Submit');
      }
    }
    await s(3000);
    await page.screenshot({ path: '4-after-launch.png' });
    LOG('After launch, URL: ' + page.url());

    // Wait for onboarding to complete (up to 2 min)
    LOG('Waiting for onboarding to complete...');
    for (let i = 0; i < 24; i++) { // 2 min
      await s(5000);
      const url = page.url();
      LOG('[' + (i+1)*5 + 's] URL: ' + url);
      await page.screenshot({ path: 'monitor-' + (i+1) + '.png' });
      
      if (!url.includes('/onboarding')) {
        LOG('Onboarding completed! Redirected to: ' + url);
        break;
      }
      
      // Check if "Creating..." is gone
      const creating = await page.locator('text=Creating').isVisible().catch(() => false);
      if (!creating) {
        LOG('Creating... is gone!');
      }
    }

    await page.screenshot({ path: '5-final.png', fullPage: true });
    await browser.close();
    LOG('Done!');
  } catch (e) {
    LOG('Error: ' + e.message);
    await page.screenshot({ path: 'error.png' });
    await browser.close();
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
