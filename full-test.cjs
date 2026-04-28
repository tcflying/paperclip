const { chromium } = require('@playwright/test');
const s = ms => new Promise(r => setTimeout(r, ms));
const LOG = msg => console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`);

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
    LOG('Logged in');

    // Create company via API from browser context
    LOG('Creating company...');
    const company = await page.evaluate(async () => {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: 'UTF8Verify' })
      });
      return res.json();
    });
    LOG('Company: ' + JSON.stringify(company));
    const companyId = company.id;
    const prefix = company.issuePrefix || company.prefix || company.slug;
    LOG('Company ID: ' + companyId + ' Prefix: ' + prefix);

    // Create CEO agent
    LOG('Creating CEO...');
    const agent = await page.evaluate(async (cid) => {
      const res = await fetch('/api/companies/' + cid + '/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: 'CEO', role: 'ceo', adapterType: 'claude_local' })
      });
      return res.json();
    }, companyId);
    LOG('Agent: ' + (agent.id || JSON.stringify(agent)));

    // Wait for agent hire to complete (check if approval needed)
    await s(3000);

    // Check if we need to approve hire
    const approvalsRes = await page.evaluate(async (cid) => {
      const res = await fetch('/api/companies/' + cid + '/approvals', { credentials: 'include' });
      return res.json();
    }, companyId);
    const approvals = approvalsRes.items || approvalsRes || [];
    LOG('Approvals: ' + approvals.length);
    
    for (const approval of approvals) {
      LOG('  Approval: ' + approval.id + ' status=' + approval.status + ' type=' + approval.type);
      if (approval.status === 'pending') {
        await page.evaluate(async (aid) => {
          await fetch('/api/approvals/' + aid + '/approve', {
            method: 'POST',
            credentials: 'include'
          });
        }, approval.id);
        LOG('  Approved!');
      }
    }

    await s(2000);

    // Get agent ID
    const agentsRes = await page.evaluate(async (cid) => {
      const res = await fetch('/api/companies/' + cid + '/agents', { credentials: 'include' });
      return res.json();
    }, companyId);
    const agents = agentsRes.items || agentsRes || [];
    const ceo = agents.find(a => a.role === 'ceo' || a.name === 'CEO');
    const ceoId = ceo ? ceo.id : null;
    LOG('CEO ID: ' + ceoId);

    // Create test issue with Chinese
    if (ceoId) {
      LOG('Creating test issue...');
      const issue = await page.evaluate(async (cid, aid) => {
        const res = await fetch('/api/companies/' + cid + '/issues', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            title: '中文编码测试：请用纯中文回复',
            body: '请用中文回复以下问题：\n1. 你好世界\n2. 招聘计划已完成\n3. 筛选阶段开始\n\n请用纯中文回复，不要用英文。',
            assigneeId: aid
          })
        });
        return res.json();
      }, companyId, ceoId);
      LOG('Issue: ' + JSON.stringify({ id: issue.id, number: issue.number, garbled: /[褰鈥睍]/.test((issue.title || '') + (issue.body || '')) }));
      
      // Navigate to issue
      if (issue.id) {
        const issuePrefix = prefix || 'UTF8Verify';
        await page.goto('http://192.168.50.233:3100/' + issuePrefix + '/issues/' + issue.id);
        await s(5000);
        await page.screenshot({ path: 'issue-page.png', fullPage: true });
        LOG('On issue page: ' + page.url());
      }
    }

    // Monitor 3 min
    LOG('Monitoring 3 min...');
    for (let i = 0; i < 18; i++) {
      await s(10000);
      await page.reload();
      await s(2000);
      
      const text = await page.locator('body').textContent().catch(() => '') || '';
      const garbled = /[褰鈥睍]/.test(text);
      const chinese = /[\u4e00-\u9fff]/.test(text);
      LOG(`[${(i+1)*10}s] Chinese=${chinese} Garbled=${garbled}`);
      
      if (garbled) {
        LOG('!!!! GARBLE DETECTED !!!!');
        await page.screenshot({ path: 'garbled.png', fullPage: true });
        break;
      }
      
      const mds = await page.locator('.paperclip-markdown').allTextContents();
      for (let j = 0; j < mds.length; j++) {
        if (/[褰鈥睍]/.test(mds[j])) {
          LOG('!!!! GARBLE IN MD[' + j + '] !!!!');
          await page.screenshot({ path: 'garbled-md.png', fullPage: true });
          break;
        }
      }
    }

    if (!/[褰鈥睍]/.test(await page.locator('body').textContent().catch(() => ''))) {
      LOG('=== NO GARBLE ===');
    }
    await page.screenshot({ path: 'final.png', fullPage: true });
    await browser.close();
    LOG('Done!');
  } catch (e) {
    LOG('Error: ' + e.message);
    await page.screenshot({ path: 'error.png' });
    await browser.close();
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
