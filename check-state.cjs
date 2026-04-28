const { chromium } = require('@playwright/test');
const s = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await page.goto('http://localhost:3100/auth');
  await page.waitForSelector('input[name="email"]', { timeout: 5000 });
  await page.locator('input[name="email"]').fill('datobig18@gmail.com');
  await page.locator('input[name="password"]').fill('666888abc');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  console.log('Logged in');

  // Check onboarding state
  await page.goto('http://localhost:3100/onboarding');
  await s(2000);
  
  // Take screenshot and check page content
  await page.screenshot({ path: 'onboarding-state.png', fullPage: true });
  
  const text = await page.locator('body').textContent().catch(() => '') || '';
  const creating = await page.locator('text=Creating').isVisible().catch(() => false);
  const done = await page.locator('text=Done').isVisible().catch(() => false);
  const error = await page.locator('text=Error').isVisible().catch(() => false);
  
  console.log('Onboarding state:');
  console.log('  Creating:', creating);
  console.log('  Done:', done);
  console.log('  Error:', error);
  console.log('  URL:', page.url());
  console.log('  Text snippet:', text.substring(0, 300));
  
  // List all visible buttons
  const btns = await page.locator('button').allTextContents();
  console.log('Buttons:', btns.filter(b => b.trim()));
  
  await browser.close();
}

main().catch(console.error);
