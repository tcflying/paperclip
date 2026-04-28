import { chromium } from 'playwright-core';

async function changeAmazonZipCode() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🌐 打开 Amazon...');
    await page.goto('https://www.amazon.com');

    // 点击 "Deliver to" 或地址按钮
    console.log('📍 查找地址选择器...');
    const deliverToButton = page.locator('#nav-global-location-slot span a').first();
    await deliverToButton.click();

    // 等待弹窗出现
    await page.waitForTimeout(2000);

    // 查找邮编输入框并修改
    console.log('✏️ 查找邮编输入框...');
    const zipInput = page.locator('#GLUXZipUpdateInput');
    if (await zipInput.isVisible()) {
      await zipInput.fill('10021');
      console.log('✅ 邮编已修改为: 10021');

      // 点击 Apply 按钮
      const applyButton = page.locator('#GLUXZipUpdate input.a-button-input');
      await applyButton.click();
      console.log('✅ 已点击应用按钮');

      // 等待更新完成
      await page.waitForTimeout(2000);
    } else {
      console.log('⚠️ 未找到邮编输入框，可能需要先登录');
      console.log('📸 截图保存当前页面...');
      await page.screenshot({ path: 'amazon-zipcode-error.png' });
    }

  } catch (error) {
    console.error('❌ 错误:', error.message);
    await page.screenshot({ path: 'amazon-zipcode-error.png' });
  } finally {
    console.log('🖼️ 截图保存为 amazon-zipcode.png');
    await page.screenshot({ path: 'amazon-zipcode.png' });
    await browser.close();
  }
}

changeAmazonZipCode();
