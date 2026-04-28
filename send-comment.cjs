const { chromium } = require('@playwright/test');
const s = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  try {
    await page.goto('http://192.168.50.233:3100/auth');
    await page.waitForSelector('input[name="email"]', { timeout: 5000 });
    await page.locator('input[name="email"]').fill('datobig18@gmail.com');
    await page.locator('input[name="password"]').fill('666888abc');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard', { timeout: 5000 });
    console.log('Logged in');

    await page.goto('http://192.168.50.233:3100/UTFAA/issues/UTFAA-1');
    await page.waitForTimeout(2000);
    console.log('On issue page');
    await page.screenshot({ path: 'issue.png' });

    // Assign CEO
    const assignBtns = await page.locator('button').all();
    for (const btn of assignBtns) {
      const t = await btn.textContent().catch(() => '');
      if (t.trim() === 'Assign') {
        await btn.click();
        console.log('Clicked Assign');
        break;
      }
    }
    await s(500);
    
    // Select CEO
    const ceoBtns = await page.locator('button').all();
    for (const btn of ceoBtns) {
      const t = await btn.textContent().catch(() => '');
      if (t.trim() === 'CEO') {
        await btn.click();
        console.log('Clicked CEO');
        break;
      }
    }
    await s(500);

    // Type message
    const editor = page.locator('.paperclip-mdxeditor-content').first();
    await editor.click();
    await s(300);
    await page.keyboard.type('Test message from playwright');
    console.log('Typed message');
    await s(500);
    await page.screenshot({ path: 'typed.png' });

    // Click Send
    const sendBtns = await page.locator('button').all();
    for (const btn of sendBtns) {
      const t = await btn.textContent().catch(() => '');
      const disabled = await btn.isDisabled().catch(() => true);
      if (t.trim() === 'Send' && !disabled) {
        await btn.click();
        console.log('Clicked Send');
        break;
      }
    }
    await s(5000);
    await page.screenshot({ path: 'after-send.png' });

    // Monitor 1 min
    for (let i = 0; i < 6; i++) {
      await s(10000);
      await page.reload();
      await s(1000);
      const text = await page.locator('body').textContent().catch(() => '');
      const garbled = /[褰鈥睍]/.test(text);
      const chinese = /[\u4e00-\u9fff]/.test(text);
      console.log(`${(i+1)*10}s Chinese=${chinese} Garbled=${garbled}`);
      if (garbled) {
        console.log('GARBLE DETECTED!');
        await page.screenshot({ path: 'garbled.png' });
        break;
      }
      const mds = await page.locator('.paperclip-markdown').allTextContents();
      for (let j = 0; j < mds.length; j++) {
        if (/[褰鈥睍]/.test(mds[j])) {
          console.log('GARBLE in MD:', mds[j].substring(0, 200));
          await page.screenshot({ path: 'garbled-md.png' });
          break;
        }
      }
    }

    await page.screenshot({ path: 'final.png' });
    await browser.close();
    console.log('Done');
  } catch (e) {
    console.error('Error:', e.message);
    await page.screenshot({ path: 'error.png' });
    await browser.close();
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
