const { chromium } = require('@playwright/test');
const s = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const page = await browser.newPage();
  await page.goto('http://localhost:3100/auth');
  await page.waitForSelector('input[name="email"]', { timeout: 5000 });
  await page.locator('input[name="email"]').fill('datobig18@gmail.com');
  await page.locator('input[name="password"]').fill('666888abc');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/dashboard', { timeout: 10000 });

  const companies = await page.evaluate(async () => {
    const res = await fetch('/api/companies', { credentials: 'include' });
    return res.json();
  });

  console.log('Companies:', companies.map(c => c.name + ' (prefix=' + (c.prefix || c.slug || 'none') + ')').join(', '));
  
  // Find UTFAA
  const utfaa = companies.find(c => (c.prefix === 'UTFAA' || c.slug === 'UTFAA'));
  console.log('UTFAA:', utfaa ? utfaa.id : 'NOT FOUND');
  
  await browser.close();
}

main().catch(console.error);
