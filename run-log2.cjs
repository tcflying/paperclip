const { chromium } = require('@playwright/test');
const s = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  // Use 192.168.50.233 for browser
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  // Login on 192.168.50.233
  await page.goto('http://192.168.50.233:3100/auth');
  await page.waitForSelector('input[name="email"]', { timeout: 5000 });
  await page.locator('input[name="email"]').fill('datobig18@gmail.com');
  await page.locator('input[name="password"]').fill('666888abc');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  console.log('Logged in');

  // List companies
  const companies = await page.evaluate(async () => {
    const res = await fetch('/api/companies', { credentials: 'include' });
    const data = await res.json();
    return data.map(c => c.name);
  });
  console.log('Companies:', companies.join(', '));

  // Find UTFAA
  const utfaaId = await page.evaluate(async (name) => {
    const res = await fetch('/api/companies', { credentials: 'include' });
    const data = await res.json();
    const c = data.find(x => x.name === name || (x.prefix || x.slug) === name);
    return c ? c.id : null;
  }, 'UTFAA');
  console.log('UTFAA id:', utfaaId || 'not found');

  if (utfaaId) {
    // Get heartbeat runs
    const runs = await page.evaluate(async (id) => {
      const res = await fetch(`/api/companies/${id}/heartbeat-runs?limit=3`, { credentials: 'include' });
      const data = await res.json();
      return (data.items || data).filter(r => r.status !== 'completed').map(r => r.id);
    }, utfaaId);
    console.log('Active runs:', runs.length, runs.map(r => r.slice(0, 8)));

    if (runs.length > 0) {
      const logData = await page.evaluate(async (runId, companyId) => {
        const res = await fetch(`/api/heartbeat-runs/${runId}/log?offset=0&limitBytes=65536`, { credentials: 'include' });
        const data = await res.json();
        return (data.entries || []).slice(-20).map(e => ({ stream: e.stream, chunk: e.chunk }));
      }, runs[0], utfaaId);
      
      for (const e of logData) {
        if (e.chunk && e.chunk.length > 5) {
          const garbled = /[褰鈥睍]/.test(e.chunk);
          const chinese = /[\u4e00-\u9fff]/.test(e.chunk);
          console.log(`[${e.stream}] garbled=${garbled} chinese=${chinese} len=${e.chunk.length}`);
          console.log(`  "${e.chunk.substring(0, 200)}"`);
        }
      }
    }
  }

  await browser.close();
  console.log('Done');
}

main().catch(e => { console.error(e.message); process.exit(1); });
