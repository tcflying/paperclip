const { chromium } = require('@playwright/test');
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
const LOG = (msg) => console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`);

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  try {
    // 1. Login
    LOG('=== Login ===');
    await page.goto('http://localhost:3100/auth');
    await page.waitForSelector('input[name="email"]', { timeout: 10000 });
    await page.locator('input[name="email"]').fill('datobig18@gmail.com');
    await page.locator('input[name="password"]').fill('666888abc');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    LOG('Logged in');

    // 2. Create issue with Chinese content via API from browser context
    LOG('\n=== Create Chinese test issue ===');
    // Use UTF8Playwright company (ec1f5d6b)
    const result = await page.evaluate(async () => {
      // First get all companies
      const companiesRes = await fetch('/api/companies', { credentials: 'include' });
      const companies = await companiesRes.json();
      
      // Find UTF8Playwright or first available company
      let company = companies.find(c => c.name === 'UTF8Playwright') || companies[0];
      
      // Create issue with Chinese content
      const issueRes = await fetch(`/api/companies/${company.id}/issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: '中文编码测试：请用纯中文回复',
          body: '这是编码测试。请用中文回复以下内容：\n1. 你好世界\n2. 招聘计划已完成\n3. 筛选阶段开始\n\n请用纯中文回复，不要用英文。'
        })
      });
      const issue = await issueRes.json();
      
      return { company: { id: company.id, name: company.name }, issue: issue };
    });
    
    LOG('Company: ' + result.company.name + ' (' + result.company.id + ')');
    LOG('Issue: ' + (result.issue.number || result.issue.id) + ' status=' + result.issue.status);
    LOG('Title garbled: ' + /[褰鈥睍]/.test(result.issue.title || ''));
    LOG('Body garbled: ' + /[褰鈥睍]/.test(result.issue.body || ''));

    if (result.issue.status === 'error' || result.issue.status === 400) {
      LOG('Error: ' + JSON.stringify(result.issue));
    }

    // 3. Navigate to the issue page
    LOG('\n=== Navigate to issue ===');
    const issueId = result.issue.id || result.issue.number;
    const companyId = result.company.id;
    await page.goto(`http://localhost:3100/issues/${issueId}?companyId=${companyId}`);
    await page.waitForTimeout(5000);
    LOG('URL: ' + page.url());

    // 4. Monitor for 3 minutes
    LOG('\n=== Monitor 3 min ===');
    let foundGarbled = false;
    let prevLen = 0;
    
    for (let i = 0; i < 18; i++) {
      await sleep(10000);
      await page.reload();
      await page.waitForTimeout(2000);
      
      const text = await page.locator('body').textContent().catch(() => '') || '';
      const garbled = /[褰鈥睍]/.test(text);
      const chinese = /[\u4e00-\u9fff]/.test(text);
      
      LOG('[' + (i+1)*10 + 's] len=' + text.length + ' Chinese=' + chinese + ' Garbled=' + garbled);
      
      if (garbled) {
        LOG('\n!!!! GARBLE DETECTED !!!!!');
        LOG(text.substring(0, 800));
        await page.screenshot({ path: 'garbled.png', fullPage: true });
        foundGarbled = true;
        break;
      }
      
      // Check all markdown elements
      const mds = await page.locator('.paperclip-markdown').allTextContents();
      for (let j = 0; j < mds.length; j++) {
        const md = mds[j];
        if (/[褰鈥睍]/.test(md)) {
          LOG('\n!!!! GARBLE IN MARKDOWN[' + j + '] !!!!!');
          LOG(md.substring(0, 300));
          await page.screenshot({ path: 'garbled-md.png', fullPage: true });
          foundGarbled = true;
          break;
        }
        if (/[\u4e00-\u9fff]/.test(md) && md.length > 50) {
          LOG('  MD[' + j + '] Chinese: ' + md.substring(0, 100));
        }
      }
      if (foundGarbled) break;
      
      if (text.length > prevLen + 30) {
        LOG('  New: ' + text.substring(text.length - 150));
        prevLen = text.length;
      }
    }

    if (!foundGarbled) {
      LOG('\n=== FINAL: No garbled text in 3 minutes ===');
      const finalText = await page.locator('body').textContent().catch(() => '') || '';
      LOG('Final len: ' + finalText.length);
      // Check all markdown
      const mds = await page.locator('.paperclip-markdown').allTextContents();
      for (let j = 0; j < mds.length; j++) {
        if (/[\u4e00-\u9fff]/.test(mds[j])) {
          LOG('MD[' + j + '] Chinese: ' + mds[j].substring(0, 100));
        }
      }
    }
    
    await page.screenshot({ path: 'final.png', fullPage: true });
    await browser.close();
    LOG('\nDone!');
    
  } catch (e) {
    LOG('Error: ' + e.message);
    await page.screenshot({ path: 'error.png' });
    await browser.close();
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
