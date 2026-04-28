const { chromium } = require('@playwright/test');
const s = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  try {
    await page.goto('http://localhost:3100/auth');
    await page.waitForSelector('input[name="email"]', { timeout: 5000 });
    await page.locator('input[name="email"]').fill('datobig18@gmail.com');
    await page.locator('input[name="password"]').fill('666888abc');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('Logged in');

    // Try to delete CoolinTest
    console.log('Deleting CoolinTest (COO)...');
    const result = await page.evaluate(async () => {
      const res = await fetch('/api/companies/f874b4c2-d35d-41b6-b8a9-a83636c0c0ec', {
        method: 'DELETE',
        credentials: 'include'
      });
      const text = await res.text();
      return { status: res.status, body: text };
    });
    console.log('Result:', result.status, result.body.substring(0, 200));

    // Verify remaining
    const remaining = await page.evaluate(async () => {
      const res = await fetch('/api/companies', { credentials: 'include' });
      const data = await res.json();
      return data.filter(c => c.status === 'active').map(c => c.name);
    });
    console.log('\nRemaining active:', remaining.length, remaining.join(', '));

    await browser.close();
    console.log('Done!');
  } catch (e) {
    console.error('Error:', e.message);
    await browser.close();
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
