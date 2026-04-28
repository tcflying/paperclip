const { chromium } = require('@playwright/test');

async function main() {
  const browser = await chromium.launch({ headless: false });
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

  const active = companies.filter(c => c.status === 'active');
  console.log('Active companies:', active.length);
  for (const c of active) {
    console.log('  -', c.name, '(' + c.issuePrefix + ')');
  }

  await browser.close();
}

main().catch(console.error);
