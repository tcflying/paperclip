const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('Navigating to issue...');
  await page.goto('http://192.168.50.233:3100/CMPA/issues/CMPA-75');
  await page.waitForTimeout(2000);
  
  // 截图看看当前状态
  await page.screenshot({ path: 'cmpa-75-initial.png', fullPage: true });
  console.log('Screenshot saved: cmpa-75-initial.png');
  
  // 尝试登录
  try {
    const emailInput = await page.$('input[type="email"]');
    const passwordInput = await page.$('input[type="password"]');
    
    if (emailInput && passwordInput) {
      console.log('Found login form, filling...');
      await emailInput.fill('paperclip');
      await passwordInput.fill('paperclip');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'cmpa-75-after-login.png', fullPage: true });
      console.log('Logged in and screenshot saved');
    } else {
      console.log('No login form found, page might already be authenticated');
    }
  } catch (e) {
    console.log('Login error:', e.message);
  }
  
  // 获取页面内容
  const content = await page.content();
  console.log('Page HTML length:', content.length);
  
  // 保存完整HTML
  const fs = require('fs');
  fs.writeFileSync('cmpa-75-page.html', content);
  console.log('Page HTML saved: cmpa-75-page.html');
  
  await browser.close();
  console.log('Done');
})();
