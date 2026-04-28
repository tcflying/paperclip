const { chromium } = require('@playwright/test');
const s = ms => new Promise(r => setTimeout(r, ms));
const LOG = msg => console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`);

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  try {
    await page.goto('http://localhost:3100/auth');
    await page.waitForSelector('input[name="email"]', { timeout: 5000 });
    await page.locator('input[name="email"]').fill('datobig18@gmail.com');
    await page.locator('input[name="password"]').fill('666888abc');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    LOG('Logged in');

    // Go to UTFAA heartbeat run
    await page.goto('http://localhost:3100/UTFAA/issues/UTFAA-1');
    await s(3000);
    await page.screenshot({ path: 'utf8-issue.png', fullPage: true });

    // Get heartbeat run log via API from browser context
    const logData = await page.evaluate(async () => {
      const companies = await (await fetch('/api/companies', { credentials: 'include' })).json();
      const utfaa = companies.find(c => c.name === 'UTFAA');
      if (!utfaa) return { error: 'UTFAA not found' };
      const runs = await (await fetch(`/api/companies/${utfaa.id}/heartbeat-runs?limit=3`, { credentials: 'include' })).json();
      const runs2 = runs.items || runs;
      const active = runs2.filter(r => r.status !== 'completed');
      if (active.length === 0) return { error: 'No active runs', companies: utfaa.id };
      const run = active[0];
      const log = await (await fetch(`/api/heartbeat-runs/${run.id}/log?offset=0&limitBytes=65536`, { credentials: 'include' })).json();
      const entries = log.entries || [];
      return { runId: run.id, status: run.status, entries: entries.map(e => ({ stream: e.stream, chunk: e.chunk })) };
    });
    
    LOG('Log data: ' + JSON.stringify({ error: logData.error, runId: logData.runId, status: logData.status, entries: logData.entries?.length }));
    
    if (logData.entries) {
      for (const e of logData.entries.slice(-20)) {
        if (e.chunk && e.chunk.length > 5) {
          const garbled = /[褰鈥睍]/.test(e.chunk);
          const chinese = /[\u4e00-\u9fff]/.test(e.chunk);
          LOG(`[${e.stream}] garbled=${garbled} chinese=${chinese} len=${e.chunk.length}`);
          LOG('  "' + e.chunk.substring(0, 200) + '"');
        }
      }
    }
    
    await page.screenshot({ path: 'utf8-final.png', fullPage: true });
    await browser.close();
    LOG('Done');
  } catch (e) {
    LOG('Error: ' + e.message);
    await page.screenshot({ path: 'utf8-error.png' });
    await browser.close();
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
