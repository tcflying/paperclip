const { chromium } = require('@playwright/test');
const s = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  try {
    await page.goto('http://192.168.50.233:3100/auth');
    await page.waitForSelector('input[name="email"]', { timeout: 8000 });
    await page.locator('input[name="email"]').fill('datobig18@gmail.com');
    await page.locator('input[name="password"]').fill('666888abc');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('Logged in');

    // Create company
    const company = await page.evaluate(async () => {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: 'DebugHire' })
      });
      return res.json();
    });
    const companyId = company.id;
    console.log('Company: ' + company.name + ' ID: ' + companyId);

    // Create CEO via agent-hires
    const hire = await page.evaluate(async (cid) => {
      const res = await fetch('/api/companies/' + cid + '/agent-hires', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: 'CEO', role: 'ceo', adapterType: 'claude_local' })
      });
      return res.json();
    }, companyId);
    
    console.log('Hire response keys:', Object.keys(hire));
    console.log('hire.id:', hire.id);
    console.log('hire.agentId:', hire.agentId);
    console.log('hire.approval:', hire.approval ? 'exists' : 'null/undefined');
    if (hire.approval) {
      console.log('hire.approval.id:', hire.approval.id);
      console.log('hire.approval.agentId:', hire.approval.agentId);
      console.log('hire.approval.status:', hire.approval.status);
    }
    console.log('hire.company:', hire.company ? 'exists' : 'null');
    if (hire.company) {
      console.log('hire.company.id:', hire.company.id);
    }

    // Find the right IDs
    let approvalId = null;
    let ceoId = null;
    
    if (hire.approval) {
      approvalId = hire.approval.id;
      ceoId = hire.approval.agentId;
    }
    if (!approvalId && hire.id) approvalId = hire.id;
    if (!ceoId && hire.agentId) ceoId = hire.agentId;
    if (!ceoId && hire.company) ceoId = hire.company.id;
    
    console.log('\nParsed: approvalId=' + approvalId + ' ceoId=' + ceoId);

    await browser.close();
  } catch (e) {
    console.error('Error: ' + e.message);
    await browser.close();
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
