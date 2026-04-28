const { chromium } = require('@playwright/test');
const s = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  
  // Login
  await page.goto('http://localhost:3100/auth');
  await page.waitForSelector('input[name="email"]', { timeout: 5000 });
  await page.locator('input[name="email"]').fill('datobig18@gmail.com');
  await page.locator('input[name="password"]').fill('666888abc');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  console.log('Logged in');
  
  // Go to companies list
  await page.goto('http://localhost:3100/companies');
  await s(2000);
  console.log('On companies page');
  
  // Find and click archive/delete button for each company
  const deleteBtn = page.locator('button:has-text("Archive"), button:has-text("Delete"), button:has-text("archive"), button:has-text("delete")').first();
  
  // Get all company cards
  const cards = await page.locator('[class*="company"], [class*="card"]').all();
  console.log('Found', cards.length, 'company cards');
  
  // Try to find archive/delete buttons in the UI
  const allBtns = await page.locator('button').allTextContents();
  console.log('All buttons:', allBtns.filter(b => b.toLowerCase().includes('archive') || b.toLowerCase().includes('delete') || b.toLowerCase().includes('remove')));
  
  // Take screenshot
  await page.screenshot({ path: 'companies.png', fullPage: true });
  
  // Check if there's a settings page for companies
  console.log('Taking screenshot to see companies UI...');
  
  await browser.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
