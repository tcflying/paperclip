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

    // Get all active companies
    const companies = await page.evaluate(async () => {
      const res = await fetch('/api/companies', { credentials: 'include' });
      const data = await res.json();
      return data.filter(c => c.status === 'active').map(c => ({ id: c.id, name: c.name, prefix: c.issuePrefix }));
    });

    console.log('Active companies:', companies.length);
    for (const c of companies) {
      console.log('  -', c.name, '(' + c.prefix + ')');
    }

    // Archive each
    for (const c of companies) {
      console.log('Archiving', c.name + '...');
      const result = await page.evaluate(async (companyId) => {
        const res = await fetch('/api/companies/' + companyId + '/archive', {
          method: 'POST',
          credentials: 'include'
        });
        return { status: res.status, body: await res.text() };
      }, c.id);
      console.log('  Result:', result.status, result.body.substring(0, 100));
    }

    // Verify
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
