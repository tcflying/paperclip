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

    const company = await page.evaluate(async () => {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: 'FinalTest' })
      });
      return res.json();
    });
    const companyId = company.id;
    const prefix = company.issuePrefix;
    LOG('Company: ' + company.name + ' Prefix: ' + prefix);

    const hire = await page.evaluate(async cid => {
      const res = await fetch('/api/companies/' + cid + '/agent-hires', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: 'CEO', role: 'ceo', adapterType: 'claude_local' })
      });
      return res.json();
    }, companyId);
    
    const approvalId = hire.approval ? hire.approval.id : hire.id;
    const agentId = hire.agent ? hire.agent.id : hire.agentId;
    LOG('Hire: approvalId=' + approvalId + ' agentId=' + agentId);

    if (approvalId) {
      await page.evaluate(aid => {
        fetch('/api/approvals/' + aid + '/approve', { method: 'POST', credentials: 'include' });
      }, approvalId);
      await s(3000);
      LOG('Approved!');
    }

    if (agentId) {
      const issueData = await page.evaluate(async opts => {
        const res = await fetch('/api/companies/' + opts.cid + '/issues', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            title: '中文编码测试：请用纯中文回复',
            body: '请用中文回复：\n1. 你好世界\n2. 招聘计划已完成\n3. 筛选阶段开始\n\n请用纯中文回复，不要英文。',
            assigneeId: opts.aid
          })
        });
        return res.json();
      }, { cid: companyId, aid: agentId });
      
      const garbled = /[褰鈥睍]/.test((issueData.title || '') + (issueData.body || ''));
      LOG('Issue: id=' + issueData.id + ' garbled=' + garbled);
      
      if (issueData.id) {
        await page.goto('http://192.168.50.233:3100/' + prefix + '/issues/' + issueData.id);
        await s(5000);
        await page.screenshot({ path: 'issue.png', fullPage: true });
        LOG('On issue page');
      }
    }

    LOG('Monitoring 3 min...');
    for (let i = 0; i < 18; i++) {
      await s(10000);
      await page.reload();
      await s(2000);
      const text = await page.locator('body').textContent().catch(() => '') || '';
      const garbled = /[褰鈥睍]/.test(text);
      const chinese = /[\u4e00-\u9fff]/.test(text);
      LOG(`[${(i+1)*10}s] Chinese=${chinese} Garbled=${garbled}`);
      if (garbled) { LOG('!!!! GARBLE !!!!'); await page.screenshot({ path: 'garbled.png', fullPage: true }); break; }
      const mds = await page.locator('.paperclip-markdown').allTextContents();
      for (let j = 0; j < mds.length; j++) {
        if (/[褰鈥睍]/.test(mds[j])) { LOG('!!!! GARBLE IN MD[' + j + '] !!!!'); await page.screenshot({ path: 'garbled-md.png', fullPage: true }); break; }
      }
    }
    if (!/[褰鈥睍]/.test(await page.locator('body').textContent().catch(() => ''))) LOG('=== NO GARBLE ===');
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
