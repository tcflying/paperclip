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
  
  // Try to go to company settings
  await page.goto('http://localhost:3100/COO/settings');
  await s(2000);
  await page.screenshot({ path: 'coo-settings.png', fullPage: true });
  
  // Look for delete/archive buttons
  const allBtns = await page.locator('button').allTextContents();
  console.log('Settings buttons:', allBtns.filter(b => b.toLowerCase().includes('delete') || b.toLowerCase().includes('archive') || b.toLowerCase().includes('danger') || b.toLowerCase().includes('remove')));
  
  // Look for any dangerous/remove options
  const dangerLinks = await page.locator('a:has-text("Delete"), a:has-text("Archive"), a:has-text("Danger"), a:has-text("Remove")').allTextContents();
  console.log('Danger links:', dangerLinks);
  
  await browser.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
